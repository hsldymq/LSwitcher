;(function (jQuery) {
    function LSlider(options) {
        var defaultOptions = {
            initIndex: 0,               // 初始的幻灯索引号
            total: 0,                   // 幻灯总数

            onInitialize: void 0,       // 用户初始化方法
            onSwitch: void 0,           // 开始执行幻灯切换的用户程序
            onBeforeSwitch: void 0,     // 在开始执行幻灯切换之前的用户程序
            onAfterSwitch: void 0,      // 完成幻灯切换后用户程序调用finish方法所触发的用户程序

            nextButton: void 0,         // "下一个"按钮,DOM对象或者jQuery对象
            prevButton: void 0,         // "上一个"按钮,DOM对象或者jQuery对象
            indicators: void 0,         // 索引按钮,DOM对象(数组)或者jQuery对象
            scrollOn: void 0,           // 定义鼠标滚轮事件的容器DOM对象或jQuery对象

            scrollUp: false,            // 是否激活鼠标滚轮向上(上一张)事件
            scrollDown: false,          // 是否激活鼠标滚轮向下(下一张)事件
            allowTrigger: false,        // 是否允许再切换的过程中再次触发切换.
                                        // 如果为false则必须完成切换在用户程序中调用finish方法才能开始下一次切换
            interval: false             // 定时器切换间隔时间(单位ms), 默认(false)关闭自动切换
        };

        var options = jQuery.extend(defaultOptions, options);
        var context = {};
        var initializer = loadOptions.call(context, options);
        initializer.call(context);

        // 返回jQuery本身
        return this;
    }

    function loadOptions(options, undefined) {
        var context = this;
        var sliderInfo = {
            currentIndex: options.initIndex,    // 当前切换到的幻灯下标
            prevIndex: options.initIndex,       // 上一幅幻灯下标
            total: options.total,               // 幻灯总数
            triggeredBy: '',                    // 用于表示当前切换是由什么触发
                                                // 'button': "上一张","下一张"按钮
                                                // 'scroll': 鼠标滚轮(向上/向下)
                                                // 'indicator': 索引按钮
                                                // 'timer': 定时器
            // 完成幻灯切换的回调
            // 用户程序在完成切换特效后必须回调此方法来完成插件收尾动作
            finish: (function () {
                return function () {
                    switching = false;
                    afterSwitch();
                    beginTimerSwitch();
                }
            }).call(context)
        };


        // 在切换过程中是否允许触发切换幻灯
        var allowTrigger = options.allowTrigger;
        // 是否开启自动切换
        var intervalOn = typeof options.interval === 'number';
        // 自动切换幻灯间隔时间,非number类型代表不允许自动切换
        var interval = intervalOn ? parseInt(options.interval) : 0;
        // "下一个"按钮
        var nextButton = jQuery(options.nextButton);
        // "上一个"按钮
        var prevButton = jQuery(options.prevButton);
        // "幻灯索引"按钮
        var indicators = jQuery(options.indicators);
        // 激活鼠标滚轮事件的容器
        var scrollOn = jQuery(options.scrollOn);
        var scrollUp = options.scrollUp;
        var scrollDown = options.scrollDown;
        // 是否正在切换
        var switching = false;
        // 定时器
        var timer = null;

        // 执行用户初始化程序
        var initialize = function () {
            if (isCallback(options.onInitialize)) {
                options.onInitialize.call(sliderInfo);
            }

            // 注册"索引"点击事件
            indicators.on('click', function () {
                if ( ! switching || allowTrigger) {
                    var index = indicators.index(this);
                    sliderInfo.prevIndex = sliderInfo.currentIndex;
                    sliderInfo.currentIndex = index;
                    sliderInfo.triggeredBy = 'indicator';
                    doSwitch();
                }
            });

            // 注册"下一个"按钮点击事件
            nextButton.on('click', function () {
                next('button');
            });

            // 注册"上一个"按钮点击事件
            prevButton.on('click', function () {
                prev('button');
            });

            // 注册鼠标滚轮事件
            if (scrollOn.length > 0 && (scrollUp || scrollDown)) {
                var domScrollOn = scrollOn[0];      // 只允许注册事件在一个容器上

                var attacher =
                    domScrollOn.addEventListener ? domScrollOn.addEventListener :
                    domScrollOn.attachEvent ? domScrollOn.attachEvent :
                    function () {};
                var onEvent =
                    domScrollOn.attachEvent ? 'onmousewheel' :
                    domScrollOn.addEventListener ? (document.mozHidden !== 'undefined' ? 'DOMMouseScroll' : 'mousewheel') :
                    null;

                attacher(onEvent, function (event) {
                    event = event || window.event;
                    var delta =
                        event.wheelDelta ? event.wheelDelta / 120 :
                        event.detail ? -event.detail / 3 :
                        void 0;
                    var isScrollingDown = delta === -1;
                    var isScrollingUp = delta === 1;

                    if (scrollUp && isScrollingUp) {
                        prev('scroll');
                    } else if (scrollDown && isScrollingDown) {
                        next('scroll');
                    }
                });
            }

            // 开始定时切换(仅在允许定时切换的情况下才会有效果)
            beginTimerSwitch();
        };

        // 开始切换前用户程序
        var beforeSwitch = function () {
            if (isCallback(options.onBeforeSwitch)) {
                options.onBeforeSwitch.call(sliderInfo);
            }
        };

        // 完成切换后用户程序,指用户在完成切换并调用finish方法之后执行
        var afterSwitch = function () {
            if (isCallback(options.onAfterSwitch)) {
                options.onAfterSwitch.call(sliderInfo);
            }
        };

        // 开始执行切换
        var doSwitch = function () {
            if (isCallback(options.onSwitch)) {
                beforeSwitch();
                switching = true;
                clearInterval(timer);
                timer = null;
                options.onSwitch.call(sliderInfo);
            }
        };

        // 定时器切换(仅在允许定时切换的情况下才会进行定时切换
        var beginTimerSwitch = function () {
            if (intervalOn && timer === null) {
                timer = setInterval(function () {
                    next('timer');
                }, interval);
            }
        };

        function next(which) {
            if ( ! switching || allowTrigger) {
                sliderInfo.prevIndex = sliderInfo.currentIndex;
                sliderInfo.currentIndex =
                    (sliderInfo.currentIndex < sliderInfo.total - 1) ? sliderInfo.currentIndex + 1 : 0;
                sliderInfo.triggeredBy = which;
                doSwitch();
            }
        }

        function prev(which) {
            if ( ! switching || allowTrigger) {
                sliderInfo.prevIndex = sliderInfo.currentIndex;
                sliderInfo.currentIndex =
                    (sliderInfo.currentIndex === 0) ? sliderInfo.total - 1 : sliderInfo.currentIndex - 1;
                sliderInfo.triggeredBy = which;
                doSwitch();
            }
        }

        function isCallback(callbackName) {
            return typeof callbackName === 'function';
        }

        return initialize;
    }

    jQuery.LSlider = LSlider;
})(jQuery);