;(function (global) {
    'use strict';

    var defaultOptions = {
        initIndex: 0,                   // 初始的幻灯索引号
        total: 0,                       // 幻灯总数

        onInit: void 0,                 // 用户初始化方法
        onSwitch: void 0,               // 开始执行幻灯切换的用户程序
        onBeforeSwitch: void 0,         // 在开始执行幻灯切换之前的用户程序
        onAfterSwitch: void 0,          // 完成幻灯切换后用户程序调用finish方法所触发的用户程序

        nextButton: void 0,             // "下一个"按钮,DOM对象或者jQuery对象
        previousButton: void 0,         // "上一个"按钮,DOM对象或者jQuery对象
        indicators: void 0,             // 索引按钮,DOM或jQuery
        scrollOn: void 0,               // 定义鼠标滚轮事件的容器DOM对象或jQuery对象

        scrollUp: false,                // 是否激活鼠标滚轮向上(上一张)事件
        scrollDown: false,              // 是否激活鼠标滚轮向下(下一张)事件
        allowContinuedTrigger: false,   // 是否允许再切换的过程中再次触发切换.

        // 如果为false则必须完成切换在用户程序中调用finish方法才能开始下一次切换
        interval: false                 // 定时器切换间隔时间(单位ms), 默认(false)关闭自动切换
    };

    var switcher = function (options) {
        var extOptions = mergeOptions(defaultOptions, options);

        return initSwitcher(extOptions);
    };

    function initSwitcher(options) {
        var switcher = {};

        var switchingContext = {
            total: options.total,
            previousIndex: 0,
            currentIndex: options.initIndex,
            triggeredBy: ''         // 'nextButton': "上一个"
                                    // 'previousButton': "下一个"按钮
                                    // 'scrollUp': 鼠标滚轮向上
                                    // 'scrollDown': 鼠标滚轮向下
                                    // 'indicator': 索引按钮
                                    // 'timer': 定时器
        };

        // 切换的总数
        var total = options.total;
        // 切换前的当前下标志
        var previousIndex = 0;
        // 切换到的当前下标值
        var currentIndex = options.initIndex;
        // 由什么触发切换
        // 'nextButton' | 'previousButton' | 'scrollUp' | 'scrollDown' | 'indicator' | 'timer'
        var triggeredBy = '';
        // 是否正在切换
        var isSwitching = false;
        // 是否允许再切换的过程中再次触发切换
        var allowContinuedTrigger = options.allowContinuedTrigger;
        // 是否开启定时切换
        var isIntervalOn = isNumber(options.interval) && options.interval > 0;
        // 定时切换间隔时间(单位ms)
        var interval = isIntervalOn && parseInt(options.interval, 10);
        // 定时器
        var intervalTimer = null;
        /** @var {HTMLElement} "上一个"按钮 */
        var nextButton = getElement(options.nextButton);
        /** @var {HTMLElement} "下一个"按钮 */
        var previousButton = getElement(options.previousButton);
        /** @var {HTMLElement} 在其上执行鼠标滚轮事件对象 */
        var scrollOn = getElement(options.scrollOn);
        /** @var {Array} 索引按钮,HTMLElement数组 */
        var indicators = getElements(options.indicators);

        // 初始化函数
        var onInit = setCallback(options.onInit, switcher);
        // 切换前回调
        var onBeforeSwitch = setCallback(options.onBeforeSwitch, switcher);
        // 切换后回调
        var onAfterSwitch = setCallback(options.onAfterSwitch, switcher);
        // 切换回调
        var onSwitch = setCallback(options.onSwitch, switcher);

        function onIndicatorClickCallback(event) {
            var i,
                len,
                index,
                target = event.target || event.srcElement;

            if (!isSwitching || allowContinuedTrigger) {
                for (i = 0, len = indicators.length; i < len; i++) {
                    if (indicators[i] === target) {
                        index = i;
                        break;
                    }
                }
                previousIndex = currentIndex;
                currentIndex = index;
                triggeredBy = 'indicator';
                doSwitch();
            }
        };

        function onPreviousButtonClickCallback() {
            prev('previousButton');
        }

        function onNextButtonClickCallback() {
            next('nextButton');
        }

        function onScrollCallback(event) {
            var delta =
                event.wheelDelta ? event.wheelDelta / 120 :
                    event.detail ? -event.detail / 3 :
                        void 0;

            var isScrollingDown = delta === -1;
            var isScrollingUp = delta === 1;

            if (isScrollingUp) {
                prev('scrollUp');
            } else if (isScrollingDown) {
                next('scrollDown');
            }
        }

        function start() {
            for (var i = 0, len = indicators.length; i < len; i++) {
                var indicator = indicators[i];
                addEventListener(indicator, 'click', onIndicatorClickCallback);
            }
            previousButton && addEventListener(previousButton, 'click', onPreviousButtonClickCallback);
            nextButton && addEventListener(nextButton, 'click', onNextButtonClickCallback);
            if (scrollOn) {
                var eventName = document.mozHidden !== undefined ? 'DOMMouseScroll' : 'mousewheel';
                addEventListener(scrollOn, eventName, onScrollCallback);
            }
            beginTimerSwitch();

            // 防止多次执行
            this.start = doNothing;
            this.stop = stop;

            return this;
        }

        function stop() {
            for (var i = 0, len = indicators.length; i < len; i++) {
                var indicator = indicators[i];
                removeEventListener(indicator, 'click', onIndicatorClickCallback);
            }
            previousButton && removeEventListener(previousButton, 'click', onPreviousButtonClickCallback);
            nextButton && removeEventListener(nextButton, 'click', onNextButtonClickCallback);
            if (scrollOn) {
                var eventName = document.mozHidden !== undefined ? 'DOMMouseScroll' : 'mousewheel';
                removeEventListener(scrollOn, eventName, onScrollCallback);
            }
            clearInterval(intervalTimer);
            intervalTimer = null;

            // 防止多次执行
            this.stop = doNothing;
            this.start = start;

            return this;
        }

        function prev(trigger) {
            if (!isSwitching || allowContinuedTrigger) {
                previousIndex = currentIndex;
                currentIndex = (currentIndex === 0) ? total - 1 : currentIndex - 1;
                triggeredBy = trigger;
                doSwitch();
            }
        };

        function next(trigger) {
            if (!isSwitching || allowContinuedTrigger) {
                previousIndex = currentIndex;
                currentIndex = (currentIndex < total - 1) ? currentIndex + 1 : 0;
                triggeredBy = trigger;
                doSwitch();
            }
        };

        function doSwitch() {
            if (isFunction(options.onSwitch)) {
                switcher.currentIndex = currentIndex;
                switcher.previousIndex = previousIndex;
                switcher.triggeredBy = triggeredBy;

                onBeforeSwitch();
                isSwitching = true;
                clearInterval(intervalTimer);
                intervalTimer = null;
                onSwitch();
            }
        };

        // 定时器切换(仅在允许定时切换的情况下才会进行定时切换)
        function beginTimerSwitch () {
            if (isIntervalOn && intervalTimer === null) {
                intervalTimer = setInterval(function () {
                    next('timer');
                }, interval);
            }
        };

        switcher.setOnInit = function (callback) {
            onInit = setCallback(callback, this, onInit);
            return this;
        };
        switcher.setOnBeforeSwitch = function (callback) {
            onBeforeSwitch = setCallback(callback, this, onBeforeSwitch);
            return this;
        };
        switcher.setOnAfterSwitch = function (callback) {
            onAfterSwitch = setCallback(callback, this, onAfterSwitch);
            return this;
        };
        switcher.setOnSwitch = function (callback) {
            onSwitch = setCallback(callback, this, onSwitch);
            return this;
        };
        switcher.setInterval = function (interval) {
            if (isNumber(interval) && interval > 0) {
                clearInterval(intervalTimer);
                intervalTimer = setInterval(function () {
                    next('timer');
                }, parseInt(interval, 10));
            }

            return this;
        };

        /**
         * 完成幻灯切换的回调.
         * 用户程序在完成切换特效后必须回调此方法来完成插件收尾动作.
         * @returns {object}
         */
        switcher.finish = function () {
            isSwitching = false;
            onAfterSwitch();
            beginTimerSwitch();

            return this;
        };
        // 开始
        switcher.start = function () {
            onInit();

            return start.call(this);
        };
        // 暂停
        switcher.stop = doNothing;

        return switcher;
    }

    // 防止start与stop方法重复执行
    // 使得start在被执行过后会被doNothing覆盖,知道stop被执行;反之亦然.
    function doNothing() {
        return this;
    }

    function isFunction(obj) {
        return typeof(obj) === 'function';
    }

    function isNumber(obj) {
        return typeof(obj) === 'number';
    }

    function isObject(obj) {
        return typeof(obj) === 'object' && obj !== null;
    }

    function mergeOptions(defaultOptions, options) {
        var merged = {};
        options = options || {};

        for (var key in defaultOptions) {
            if (defaultOptions.hasOwnProperty(key)) {
                merged[key] = options.hasOwnProperty(key) ? options[key] : defaultOptions[key];
            }
        }

        return merged;
    }

    function bind(func, context) {
        return isFunction(func.bind) ? func.bind(context) : function () {
            func.apply(context, arguments);
        };
    }

    function setCallback(callback, context, defaultCallback) {
        defaultCallback = isFunction(defaultCallback) ? defaultCallback : function () {};

        return isFunction(callback) ? bind(callback, context) : defaultCallback;
    }

    function addEventListener(obj, event, callback) {
        if (obj.addEventListener) {
            obj.addEventListener(event, callback, false);
        } else if (obj.attachEvent) {
            obj.attachEvent('on' + event, callback);
        }
    }

    function removeEventListener(obj, event, callback) {
        if (obj.removeEventListener) {
            obj.removeEventListener(event, callback);
        } else if (obj.detachEvent) {
            obj.detachEvent('on' + event, callback);
        }
    }

    function getElement(obj) {
        if (obj instanceof HTMLElement) {
            return obj
        } else if (obj instanceof HTMLCollection) {
            return obj.length > 0 ? obj.item(0) : null;
        } else if (isObject(obj) && typeof(obj.jquery) === 'string') {
            return obj.length > 0 ? obj.get(0) : null;
        } else {
            return null;
        }
    }

    function getElements(obj) {
        var ret = [];

        if (obj instanceof HTMLElement) {
            return [obj];
        } else if (obj instanceof HTMLCollection) {
            for (var i = 0, len = obj.length; i < len; i++) {
                ret.push(obj.item(i));
            }
            return ret;
        } else if (isObject(obj) && typeof(obj.jquery) === 'string') {
            return obj.get();
        } else {
            return [];
        }
    }

    global.LSwitcher = switcher;
})(this);