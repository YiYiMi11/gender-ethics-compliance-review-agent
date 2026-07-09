document.addEventListener('DOMContentLoaded', function () {
    var navbar = document.getElementById('navbar');
    var navToggle = document.getElementById('nav-toggle');
    var navMenu = document.getElementById('nav-menu');
    var navLinks = navMenu.querySelectorAll('a');
    var NAV_H = 60;

    window.togglePrinciple = function (el) {
        el.classList.toggle('open');
    };
    window.toggleCase = function (el) {
        el.classList.toggle('open');
    };

    navToggle.addEventListener('click', function () {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    navLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            var target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({ top: target.offsetTop - NAV_H, behavior: 'smooth' });
            }
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    window.addEventListener('scroll', function () {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        var sections = document.querySelectorAll('section[id], header[id]');
        var scrollPos = window.scrollY + NAV_H + 20;
        sections.forEach(function (section) {
            var top = section.offsetTop;
            var height = section.offsetHeight;
            var id = section.getAttribute('id');
            var link = navMenu.querySelector('a[href="#' + id + '"]');
            if (link) {
                if (scrollPos >= top && scrollPos < top + height) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            }
        });
    });

    var demoSubmit = document.getElementById('demo-submit');
    var demoInput = document.getElementById('demo-input');
    var demoPlatform = document.getElementById('demo-platform');
    var demoLoading = document.getElementById('demo-loading');
    var demoLoadingText = document.getElementById('demo-loading-text');

    document.querySelectorAll('.demo-preset').forEach(function (btn) {
        btn.addEventListener('click', function () {
            demoInput.value = this.getAttribute('data-text');
            demoInput.focus();
        });
    });

    var demoLoadingSteps = document.getElementById('demo-loading-steps');
    var demoResult = document.getElementById('demo-result');
    var loadingSteps = [
        { text: '正在解析文本语义...', delay: 800 },
        { text: '正在调用知识库检索...', delay: 1800 },
        { text: '正在匹配风险模式...', delay: 3000 },
        { text: '正在生成审查报告...', delay: 5000 },
        { text: '正在优化改写建议...', delay: 8000 },
    ];
    var stepTimers = [];

    function startLoadingAnimation() {
        demoLoadingText.textContent = '思考中...';
        demoLoadingSteps.innerHTML = '';
        stepTimers.forEach(function (t) { clearTimeout(t); });
        stepTimers = [];
        loadingSteps.forEach(function (step, i) {
            var timer = setTimeout(function () {
                var el = document.createElement('div');
                el.className = 'demo-loading-step';
                el.textContent = step.text;
                demoLoadingSteps.appendChild(el);
                while (demoLoadingSteps.children.length > 2) {
                    demoLoadingSteps.removeChild(demoLoadingSteps.firstChild);
                }
            }, step.delay);
            stepTimers.push(timer);
        });
    }

    function stopLoadingAnimation() {
        stepTimers.forEach(function (t) { clearTimeout(t); });
        stepTimers = [];
    }

    if (demoSubmit) {
        demoSubmit.addEventListener('click', function () {
            var text = demoInput.value.trim();
            if (!text) {
                demoInput.focus();
                demoInput.style.borderColor = 'var(--accent)';
                setTimeout(function () { demoInput.style.borderColor = ''; }, 2000);
                return;
            }
            var platform = demoPlatform.value;
            demoLoading.classList.add('active');
            demoResult.classList.remove('active');
            demoResult.innerHTML = '';
            demoSubmit.disabled = true;
            demoSubmit.textContent = '思考中...';
            startLoadingAnimation();
            var firstChunk = true;
            fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: text, platform: platform })
            }).then(function (response) {
                if (!response.ok) throw new Error('API request failed');
                var reader = response.body.getReader();
                var decoder = new TextDecoder();
                var accumulated = '';
                function read() {
                    return reader.read().then(function (result) {
                        if (result.done) {
                            stopLoadingAnimation();
                            demoLoading.classList.remove('active');
                            demoResult.classList.add('active');
                            demoSubmit.disabled = false;
                            demoSubmit.textContent = '提交审查';
                            return;
                        }
                        var chunk = decoder.decode(result.value, { stream: true });
                        var lines = chunk.split('\n');
                        lines.forEach(function (line) {
                            if (line.startsWith('data: ')) {
                                var data = line.slice(6);
                                if (data === '[DONE]') return;
                                try {
                                    var parsed = JSON.parse(data);
                                    if (parsed.content) {
                                        if (firstChunk) {
                                            firstChunk = false;
                                            stopLoadingAnimation();
                                            demoLoading.classList.remove('active');
                                            demoResult.classList.add('active');
                                        }
                                        accumulated += parsed.content;
                                        demoResult.innerHTML = marked.parse(accumulated);
                                        demoResult.scrollTop = demoResult.scrollHeight;
                                    }
                                } catch (e) {}
                            }
                        });
                        return read();
                    });
                }
                return read();
            }).catch(function (error) {
                stopLoadingAnimation();
                demoLoading.classList.remove('active');
                demoResult.classList.add('active');
                demoResult.innerHTML = '<p style="color: var(--accent);">审查请求失败：' + error.message + '</p>';
                demoSubmit.disabled = false;
                demoSubmit.textContent = '提交审查';
            });
        });
    }

    var challengeData = [
        { scenario: '某手机品牌广告中一名男性用手比划女性身体部位介绍新机型。', question: '这属于什么风险？', options: ['角色刻板印象','物化女性','无意识偏见','公序良俗'], answer: 1, explanation: '将女性身体作为产品功能的类比对象属于物化女性行为。' },
        { scenario: '某洗衣液品牌母亲节文案："妈妈您先用""让妈妈洗衣更轻松"。', question: '这属于什么风险？', options: ['颜色歧视','角色刻板印象','绝对化用语','数据造假'], answer: 1, explanation: '默认母亲承担家务劳动强化了"女性=家务"的刻板印象。' },
        { scenario: '某吐司品牌广告语："用爸爸的标准做一片好吐司"。', question: '该文案存在什么性别伦理问题？', options: ['物化男性','角色刻板印象','性别对立','无问题'], answer: 1, explanation: '"爸爸的标准"暗示男性＝品质代名词属于角色刻板印象。' },
        { scenario: '某汽车品牌妇女节视频："这个行业女性普遍比较少""女性不该只坐副驾"。', question: '这种表述的问题在于？', options: ['陈述事实没问题','强化了职业性别偏见','侮辱女性','违反广告法'], answer: 1, explanation: '用否定句式强化了"副驾＝女性位置"的预设看似鼓励实则固化偏见。' },
        { scenario: '某汽车品牌邀请有争议的脱口秀演员合作宣传引发舆论争议。', question: '从合规角度这属于什么风险？', options: ['完全没风险','产品功能描述不清','因合作方特殊性构成对立煽动风险','价格欺诈'], answer: 2, explanation: '合作方本身具有性别争议标签合作行为会被解读为站队。' },
        { scenario: '某美妆品牌广告词："用了我们的产品让你男朋友离不开你"。', question: '该文案存在什么问题？', options: ['宣传效果很好','隐含女性价值依附于男性认可','产品描述不准确','没有品牌名'], answer: 1, explanation: '将女性魅力与留住男性绑定隐含着"女性打扮是为取悦男性"的价值导向。' },
        { scenario: '某公司招聘启事："招聘程序员要求男性25-35岁"。', question: '这违反了哪项法律规定？', options: ['广告法','妇女权益保障法','劳动法','网络安全法'], answer: 1, explanation: '《妇女权益保障法》明确禁止在招聘中限定男性优先或性别歧视。' },
        { scenario: '某公司宣传片："我们的女员工都很细心地完成了工作"。', question: '这种表述属于什么？', options: ['表扬女员工没问题','无意识偏见将细心与女性绑定','违反广告法','内容安全'], answer: 1, explanation: '将"细心"与女性捆绑属于典型的无意识偏见P2级别。' },
        { scenario: '某家电广告："爸爸负责赚钱养家妈妈负责精致生活"。', question: '该文案的风险是什么？', options: ['典型家庭模式没问题','强化了性别角色分工的刻板印象','侮辱男性','虚构家庭关系'], answer: 1, explanation: '将"赚钱养家"分配给男性"精致生活"分配给女性强化了传统性别角色分工。' },
        { scenario: '某活动宣传文案："欢迎各位小哥哥小姐姐来参加"。', question: '这种称呼属于什么层级？', options: ['完全安全','P0绝对禁止','P1高风险对立词','P2无意识偏见'], answer: 3, explanation: '以外貌/性别标签替代中性称呼属于P2无意识偏见层级。' }
    ];

    var challengeOverlay = document.getElementById('challengeOverlay');
    var challengeBtn = document.getElementById('challenge-btn');
    var challengeClose = document.getElementById('challengeClose');
    var challengeBody = document.getElementById('challengeBody');
    var challengeResult = document.getElementById('challengeResult');
    var challengeScenario = document.getElementById('challengeScenario');
    var challengeQText = document.getElementById('challengeQText');
    var challengeOptions = document.getElementById('challengeOptions');
    var challengePrev = document.getElementById('challengePrev');
    var challengeNext = document.getElementById('challengeNext');
    var challengeRestart = document.getElementById('challengeRestart');
    var qCurrent = document.getElementById('qCurrent');
    var qTotal = document.getElementById('qTotal');
    var progressFill = document.getElementById('progressFill');
    var challengeScore = document.getElementById('challengeScore');
    var challengeRank = document.getElementById('challengeRank');
    var challengeReview = document.getElementById('challengeReview');
    var currentQ = 0;
    var userAnswers = [];

    function openChallenge() {
        currentQ = 0;
        userAnswers = new Array(challengeData.length).fill(-1);
        challengeOverlay.classList.add('active');
        challengeBody.style.display = '';
        challengeResult.style.display = 'none';
        renderQuestion();
    }
    function closeChallenge() { challengeOverlay.classList.remove('active'); }

    function renderQuestion() {
        var data = challengeData[currentQ];
        qTotal.textContent = challengeData.length;
        qCurrent.textContent = currentQ + 1;
        progressFill.style.width = ((currentQ + 1) / challengeData.length * 100) + '%';
        challengeScenario.textContent = '📋 ' + data.scenario;
        challengeQText.textContent = data.question;
        var html = '';
        for (var i = 0; i < data.options.length; i++) {
            var selected = userAnswers[currentQ] === i ? ' selected' : '';
            html += '<div class="challenge-option' + selected + '" data-idx="' + i + '"><span class="challenge-option-letter">' + String.fromCharCode(65 + i) + '</span><span class="challenge-option-text">' + data.options[i] + '</span></div>';
        }
        challengeOptions.innerHTML = html;
        document.querySelectorAll('.challenge-option').forEach(function (el) {
            el.addEventListener('click', function () { selectOption(parseInt(this.getAttribute('data-idx'))); });
        });
        challengePrev.style.display = currentQ === 0 ? 'none' : '';
        challengeNext.textContent = currentQ === challengeData.length - 1 ? '完成挑战' : '下一题 →';
    }

    function selectOption(idx) {
        userAnswers[currentQ] = idx;
        document.querySelectorAll('.challenge-option').forEach(function (el) { el.classList.remove('selected'); });
        document.querySelector('.challenge-option[data-idx="' + idx + '"]').classList.add('selected');
        setTimeout(function () {
            if (currentQ < challengeData.length - 1) { currentQ++; renderQuestion(); }
            else { showResult(); }
        }, 400);
    }

    function showResult() {
        challengeBody.style.display = 'none';
        challengeResult.style.display = '';
        var score = 0;
        for (var i = 0; i < challengeData.length; i++) { if (userAnswers[i] === challengeData[i].answer) { score += 10; } }
        challengeScore.innerHTML = '<span class="challenge-score-num">' + score + '</span><span class="challenge-score-total"> / 100</span>';
        var rank = score >= 90 ? '🌟 性别伦理专家级！' : score >= 70 ? '👍 优秀！' : score >= 50 ? '📖 及格！' : '💪 需要加强！';
        challengeRank.textContent = rank;
        var reviewHtml = '<h3 class="challenge-review-title">答题回顾</h3>';
        for (var i = 0; i < challengeData.length; i++) {
            var d = challengeData[i], isCorrect = userAnswers[i] === d.answer;
            var userLabel = userAnswers[i] >= 0 ? String.fromCharCode(65 + userAnswers[i]) : '未作答';
            var correctLabel = String.fromCharCode(65 + d.answer);
            reviewHtml += '<div class="challenge-review-item ' + (isCorrect ? 'correct' : 'wrong') + '"><div class="challenge-review-q">第' + (i+1) + '题：' + d.question + '</div><div class="challenge-review-answer">你的答案：' + userLabel + ' ' + d.options[userAnswers[i] >= 0 ? userAnswers[i] : 0] + '</div><div class="challenge-review-correct">正确答案：' + correctLabel + ' ' + d.options[d.answer] + '</div><div class="challenge-review-explain">💡 ' + d.explanation + '</div></div>';
        }
        challengeReview.innerHTML = reviewHtml;
    }

    if (challengeBtn) { challengeBtn.addEventListener('click', function (e) { e.preventDefault(); openChallenge(); }); }
    if (challengeClose) { challengeClose.addEventListener('click', closeChallenge); }
    challengeOverlay.addEventListener('click', function (e) { if (e.target === challengeOverlay) closeChallenge(); });
    if (challengePrev) { challengePrev.addEventListener('click', function () { if (currentQ > 0) { currentQ--; renderQuestion(); } }); }
    if (challengeRestart) { challengeRestart.addEventListener('click', function () { openChallenge(); }); }
    var qrFloat = document.getElementById('qrFloat');
    var qrFloatClose = document.getElementById('qrFloatClose');
    if (qrFloatClose) { qrFloatClose.addEventListener('click', function () { qrFloat.style.display = 'none'; }); }
});