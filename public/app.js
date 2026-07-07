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
                smoothScrollTo(target.offsetTop - NAV_H, 800);
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

    // Smooth scroll snap
    var snapSections = [];
    function collectSections() {
        snapSections = [];
        var els = document.querySelectorAll('header.hero, section.sect, footer.foot');
        els.forEach(function (el) {
            snapSections.push({
                top: el.offsetTop - NAV_H,
                bottom: el.offsetTop + el.offsetHeight - NAV_H,
                height: el.offsetHeight
            });
        });
    }
    collectSections();
    window.addEventListener('resize', collectSections);

    var isAnimating = false;
    var animFrame = null;

    function easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function smoothScrollTo(targetY, duration) {
        if (isAnimating) {
            cancelAnimationFrame(animFrame);
        }
        var startY = window.scrollY;
        var diff = targetY - startY;
        if (Math.abs(diff) < 2) return;
        var start = null;
        isAnimating = true;

        function step(timestamp) {
            if (!start) start = timestamp;
            var elapsed = timestamp - start;
            var progress = Math.min(elapsed / duration, 1);
            var eased = easeInOutCubic(progress);
            window.scrollTo(0, startY + diff * eased);
            if (progress < 1) {
                animFrame = requestAnimationFrame(step);
            } else {
                isAnimating = false;
            }
        }
        animFrame = requestAnimationFrame(step);
    }

    function getCurrentSection() {
        var viewTop = window.scrollY;
        var viewBottom = viewTop + window.innerHeight;
        for (var i = 0; i < snapSections.length; i++) {
            var s = snapSections[i];
            if (viewTop >= s.top - 2 && viewTop < s.bottom) {
                return i;
            }
        }
        for (var i = 0; i < snapSections.length; i++) {
            var s = snapSections[i];
            if (viewBottom > s.top && viewTop < s.bottom) {
                return i;
            }
        }
        return -1;
    }

    function shouldSnap(dir) {
        var idx = getCurrentSection();
        if (idx < 0) return true;
        var s = snapSections[idx];
        var viewH = window.innerHeight;
        var sectionFits = s.height <= viewH + 2;

        if (sectionFits) return true;

        var viewTop = window.scrollY;
        var viewBottom = viewTop + viewH;

        if (dir > 0) {
            return viewBottom >= s.bottom - 4;
        } else {
            return viewTop <= s.top + 4;
        }
    }

    function findNearestSection(direction) {
        var currentY = window.scrollY;
        var threshold = 40;
        if (direction > 0) {
            for (var i = 0; i < snapSections.length; i++) {
                if (snapSections[i].top > currentY + threshold) return snapSections[i].top;
            }
        } else {
            for (var i = snapSections.length - 1; i >= 0; i--) {
                if (snapSections[i].top < currentY - threshold) return snapSections[i].top;
            }
        }
        return null;
    }

    var wheelAccum = 0;
    var wheelTimer = null;
    var WHEEL_THRESHOLD = 60;

    window.addEventListener('wheel', function (e) {
        if (isAnimating) {
            e.preventDefault();
            return;
        }

        var demoTextarea = document.getElementById('demo-input');
        if (demoTextarea && demoTextarea.matches(':focus')) return;

        var dir = e.deltaY > 0 ? 1 : -1;

        if (!shouldSnap(dir)) return;

        wheelAccum += e.deltaY;
        clearTimeout(wheelTimer);

        wheelTimer = setTimeout(function () {
            wheelAccum = 0;
        }, 200);

        if (Math.abs(wheelAccum) >= WHEEL_THRESHOLD) {
            e.preventDefault();
            wheelAccum = 0;
            clearTimeout(wheelTimer);

            var target = findNearestSection(dir);
            if (target !== null) {
                smoothScrollTo(target, 900);
            }
        }
    }, { passive: false });

    var touchStartY = 0;
    var touchStartTime = 0;

    window.addEventListener('touchstart', function (e) {
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
    }, { passive: true });

    window.addEventListener('touchend', function (e) {
        if (isAnimating) return;
        var touchEndY = e.changedTouches[0].clientY;
        var diff = touchStartY - touchEndY;
        var elapsed = Date.now() - touchStartTime;
        if (Math.abs(diff) > 50 && elapsed < 500) {
            var dir = diff > 0 ? 1 : -1;
            if (!shouldSnap(dir)) return;
            var target = findNearestSection(dir);
            if (target !== null) {
                smoothScrollTo(target, 900);
            }
        }
    }, { passive: true });

    window.addEventListener('keydown', function (e) {
        if (isAnimating) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        var dir = 0;
        if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
            dir = 1;
            e.preventDefault();
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            dir = -1;
            e.preventDefault();
        } else if (e.key === 'Home') {
            e.preventDefault();
            smoothScrollTo(0, 900);
            return;
        } else if (e.key === 'End') {
            e.preventDefault();
            smoothScrollTo(document.documentElement.scrollHeight - window.innerHeight, 900);
            return;
        }

        if (dir !== 0) {
            if (!shouldSnap(dir)) {
                var scrollAmt = window.innerHeight * 0.8;
                smoothScrollTo(window.scrollY + dir * scrollAmt, 500);
                return;
            }
            var target = findNearestSection(dir);
            if (target !== null) {
                smoothScrollTo(target, 900);
            }
        }
    });

    // Demo section
    var demoSubmit = document.getElementById('demo-submit');
    var demoInput = document.getElementById('demo-input');
    var demoPlatform = document.getElementById('demo-platform');
    var demoLoading = document.getElementById('demo-loading');
    var demoLoadingText = document.getElementById('demo-loading-text');
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
