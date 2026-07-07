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
                window.scrollTo({
                    top: target.offsetTop - NAV_H,
                    behavior: 'smooth'
                });
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

    // Demo section
    var demoSubmit = document.getElementById('demo-submit');
    var demoInput = document.getElementById('demo-input');
    var demoPlatform = document.getElementById('demo-platform');
    var demoLoading = document.getElementById('demo-loading');
    var demoLoadingText = document.getElementById('demo-loading-text');

    // Preset text buttons – fill textarea on click
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
            })
            .then(function (response) {
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
            })
            .catch(function (error) {
                stopLoadingAnimation();
                demoLoading.classList.remove('active');
                demoResult.classList.add('active');
                demoResult.innerHTML = '<p style="color: var(--accent);">审查请求失败：' + error.message + '</p>';
                demoSubmit.disabled = false;
                demoSubmit.textContent = '提交审查';
            });
        });
    }

});