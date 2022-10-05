/**
 * [Chart.PieceLabel.js]{@link https://github.com/Baek-SeungJae/chartjs-plugin-labels https://github.com/Baek-SeungJae/chartjs-plugin-labels}
 *
 * @version 0.9.2
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2017
 * @original https://github.com/emn178/chartjs-plugin-labels
 * @forkedby Baek-SeungJae 2022
 * @license MIT
 */
(function () {
    'use strict';

    if (typeof Chart === 'undefined') {
        console.error('Can not find Chart object.');
        return;
    }

    const SUPPORTED_TYPES = {};
    ['pie', 'doughnut', 'polarArea'].forEach(function (t) {
        SUPPORTED_TYPES[t] = true;
    });

    function OutsideLabel() {
        this.renderToDataset = this.renderToDataset.bind(this);
    }

    OutsideLabel.prototype.setup = function (chart, options) {
        this.chart = chart;
        this.ctx = chart.ctx;
        this.args = {};
        this.barTotal = {};
        const chartOptions = chart.config.options;
        this.options = Object.assign({
            position: 'default',
            precision: 0,
            fontSize: chartOptions.defaultFontSize,
            fontColor: chartOptions.defaultFontColor,
            fontStyle: chartOptions.defaultFontStyle,
            fontFamily: chartOptions.defaultFontFamily,
            shadowOffsetX: 3,
            shadowOffsetY: 3,
            shadowColor: 'rgba(0,0,0,0.3)',
            shadowBlur: 6,
            outsidePadding: 2,
            textMargin: 2,
            overlap: true
        }, options);
    };

    OutsideLabel.prototype.render = function () {
        this.labelBounds = [];
        this.chart.data.datasets.forEach(this.renderToDataset);
    };

    OutsideLabel.prototype.renderToDataset = function (dataset, argsIndex) {
        this.totalPercentage = 0;
        this.total = null;
        const arg = this.args[argsIndex];
        arg.meta.data.forEach(function (element, index) {
            this.renderToElement(dataset, arg, element, index);
        }.bind(this));
    };

    OutsideLabel.prototype.renderToElement = function (dataset, arg, element, index) {
        if (!this.shouldRenderToElement(arg.meta, element)) {
            return;
        }
        this.percentage = null;
        const label = this.getLabel(dataset, element, index);
        if (!label) {
            return;
        }
        const ctx = this.ctx;
        ctx.save();
        ctx.font = Chart.helpers.fontString(this.options.fontSize, this.options.fontStyle, this.options.fontFamily);
        const renderInfo = this.getRenderInfo(element, label);
        if (!this.drawable(element, label, renderInfo)) {
            ctx.restore();
            return;
        }
        ctx.beginPath();
        ctx.fillStyle = this.getFontColor(dataset, element, index);
        this.renderLabel(label, renderInfo);
        this.renderSegment(element, label);
        ctx.restore();
    };

    OutsideLabel.prototype.renderLabel = function (label, renderInfo) {
        return this.options.arc ? this.renderArcLabel(label, renderInfo) : this.renderBaseLabel(label, renderInfo);
    };

    OutsideLabel.prototype.renderBaseLabel = function (label, position) {
        const ctx = this.ctx;

        ctx.save();
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';

        if (this.options.textShadow) {
            ctx.shadowOffsetX = this.options.shadowOffsetX;
            ctx.shadowOffsetY = this.options.shadowOffsetY;
            ctx.shadowColor = this.options.shadowColor;
            ctx.shadowBlur = this.options.shadowBlur;
        }

        const lines = label.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const y = (position.y - this.options.fontSize / 2 * lines.length + this.options.fontSize * i) * 0.9;
            ctx.fillText(lines[i], position.x, y);
        }
        ctx.restore();

    };

    OutsideLabel.prototype.renderArcLabel = function (label, renderInfo) {
        const ctx = this.ctx, radius = renderInfo.radius, view = renderInfo.view;
        ctx.save();
        ctx.translate(view.x, view.y);
        if (typeof label === 'string') {
            ctx.rotate(renderInfo.startAngle);
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            const lines = label.split('\n');
            const widths = [];
            const offset = this.options.position === 'border' ? (lines.length - 1) * this.options.fontSize / 2 : 0;
            let max = 0;

            for (const line of lines) {
                const metrics = ctx.measureText(line);
                if (metrics.width > max) {
                    max = metrics.width;
                }
                widths.push(metrics.width);
            }
            for (let j = 0; j < lines.length; ++j) {
                const line = lines[j];
                const y = (lines.length - 1 - j) * -this.options.fontSize + offset;
                ctx.save();
                const padding = (max - widths[j]) / 2;
                ctx.rotate(padding / radius);
                for (let i = 0; i < line.length; i++) {
                    const char = line.charAt(i);
                    const metrics = ctx.measureText(char);
                    ctx.save();
                    ctx.translate(0, -1 * radius);
                    ctx.fillText(char, 0, y);
                    ctx.restore();
                    ctx.rotate(metrics.width / radius);
                }
                ctx.restore();
            }
        } else {
            ctx.rotate((view.startAngle + Math.PI / 2 + renderInfo.endAngle) / 2);
            ctx.translate(0, -1 * radius);
            this.renderLabel(label, {x: 0, y: 0});
        }
        ctx.restore();
    };

    OutsideLabel.prototype.renderSegment = function (element, label) {
        const arcInfo = this.getArcRenderInfo(element, label);
        const position = this.getBaseRenderInfo(element, label);
        const ctx = this.ctx;
        const radius = arcInfo.radius;
        const view = arcInfo.view;
        const centreAngle = view.startAngle + (view.endAngle - view.startAngle) / 2;
        const lines = label.split('\n');

        const metrics = ctx.measureText(lines[lines.length / 2]);

        if (this.options.segment) {
            const start = {
                x: view.x + (Math.cos(centreAngle) * view.outerRadius),
                y: view.y + (Math.sin(centreAngle) * view.outerRadius)
            };
            const end = {
                x: view.x + (Math.cos(centreAngle) * radius),
                y: view.y + (Math.sin(centreAngle) * radius * 0.95)
            };
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);

            ctx.strokeStyle = view.backgroundColor;
            ctx.lineWidth = 1;
            ctx.lineTo(end.x, end.y);
            if (start.x < end.x) {
                position.x = position.x + 10;
                end.x = position.x - metrics.width / 2 - 1;
            } else {
                position.x = position.x - 10;
                end.x = position.x + metrics.width / 2 + 1;
            }

            ctx.lineTo(end.x, end.y);
            ctx.stroke();
        }
    };

    OutsideLabel.prototype.shouldRenderToElement = function (meta, element) {
        return !meta.hidden && !element.hidden && (this.options.showZero || this.chart.config.type === 'polarArea' ? element._view.outerRadius !== 0 : element._view.circumference !== 0);
    };

    OutsideLabel.prototype.getLabel = function (dataset, element, index) {
        let label;
        if (typeof this.options.render === 'function') {
            label = this.options.render({
                label: this.chart.config.data.labels[index],
                value: dataset.data[index],
                percentage: this.getPercentage(dataset, element, index),
                dataset: dataset,
                index: index
            });
        } else {
            switch (this.options.render) {
                case 'value':
                    label = dataset.data[index];
                    break;
                case 'label':
                    label = this.chart.config.data.labels[index];
                    break;
                case 'percentage':
                    label = this.getPercentage(dataset, element, index) + '%';
                    break;
                default:
                    label = '';

            }
        }
        if (label !== null && label !== undefined) {
            label = label.toString();
        }
        return label;
    };

    OutsideLabel.prototype.getFontColor = function (dataset, element, index) {
        let fontColor = this.options.fontColor;
        if (typeof fontColor === 'function') {
            fontColor = fontColor({
                label: this.chart.config.data.labels[index],
                value: dataset.data[index],
                percentage: this.getPercentage(dataset, element, index),
                backgroundColor: dataset.backgroundColor[index],
                dataset: dataset,
                index: index
            });
        } else if (typeof fontColor !== 'string') {
            fontColor = fontColor[index] || this.chart.config.options.defaultFontColor;
        }
        return fontColor;
    };

    OutsideLabel.prototype.getPercentage = function (dataset, element, index) {
        if (this.percentage !== null) {
            return this.percentage;
        }
        let percentage;
        if (this.chart.config.type === 'polarArea') {
            if (this.total === null) {
                this.total = 0;
                for (const data of dataset.data) {
                    this.total += data;
                }
            }
            percentage = dataset.data[index] / this.total * 100;
        } else if (this.chart.config.type === 'bar') {
            if (this.barTotal[index] === undefined) {
                this.barTotal[index] = 0;
                for (const chartDataset of this.chart.data.datasets) {
                    this.barTotal[index] += chartDataset.data[index];
                }
            }
            percentage = dataset.data[index] / this.barTotal[index] * 100;
        } else {
            percentage = element._view.circumference / this.chart.config.options.circumference * 100;
        }
        percentage = parseFloat(percentage.toFixed(this.options.precision));
        if (!this.options.showActualPercentages) {
            if (this.chart.config.type === 'bar') {
                this.totalPercentage = this.barTotalPercentage[index] || 0;
            }
            this.totalPercentage += percentage;
            if (this.totalPercentage > 100) {
                percentage -= this.totalPercentage - 100;
                percentage = parseFloat(percentage.toFixed(this.options.precision));
            }
            if (this.chart.config.type === 'bar') {
                this.barTotalPercentage[index] = this.totalPercentage
            }
        }
        this.percentage = percentage;
        return percentage;
    };

    OutsideLabel.prototype.getRenderInfo = function (element, label) {
        if (this.chart.config.type === 'bar') {
            return this.getBarRenderInfo(element, label);
        } else {
            return this.options.arc ? this.getArcRenderInfo(element, label) : this.getBaseRenderInfo(element, label);
        }
    };

    OutsideLabel.prototype.getBaseRenderInfo = function (element, label) {
        if (this.options.position === 'outside' || this.options.position === 'border') {
            const view = element._view;
            const centreAngle = view.startAngle + (view.endAngle - view.startAngle) / 2;
            const innerRadius = view.outerRadius / 2;
            let rangeFromCentre;
            if (this.options.position === 'border') {
                rangeFromCentre = (view.outerRadius - innerRadius) / 2 + innerRadius;
            } else if (this.options.position === 'outside') {
                rangeFromCentre = (view.outerRadius - innerRadius) + innerRadius + this.options.textMargin;
            }
            const renderInfo = {
                x: view.x + (Math.cos(centreAngle) * rangeFromCentre),
                y: view.y + (Math.sin(centreAngle) * rangeFromCentre)
            };
            if (this.options.position === 'outside') {
                const offset = this.options.textMargin + this.measureLabel(label).width / 2;
                renderInfo.x += renderInfo.x < view.x ? -offset : offset;
            }
            return renderInfo;
        } else {
            return element.tooltipPosition();
        }
    };

    OutsideLabel.prototype.getArcRenderInfo = function (element, label) {
        let radius;
        const view = element._view;
        if (this.options.position === 'outside') {
            radius = view.outerRadius + this.options.fontSize + this.options.textMargin;
        } else if (this.options.position === 'border') {
            radius = (view.outerRadius / 2 + view.outerRadius) / 2;
        } else {
            radius = (view.innerRadius + view.outerRadius) / 2;
        }
        let startAngle = view.startAngle;
        let endAngle = view.endAngle;
        const totalAngle = endAngle - startAngle;
        startAngle += Math.PI / 2;
        endAngle += Math.PI / 2;
        const metrics = this.measureLabel(label);
        startAngle += (endAngle - (metrics.width / radius + startAngle)) / 2;
        return {
            radius: radius,
            startAngle: startAngle,
            endAngle: endAngle,
            totalAngle: totalAngle,
            view: view
        }
    };

    OutsideLabel.prototype.getBarRenderInfo = function (element, label) {
        const renderInfo = element.tooltipPosition();
        renderInfo.y -= this.measureLabel(label).height / 2 + this.options.textMargin;
        return renderInfo;
    };

    OutsideLabel.prototype.drawable = function (element, label, renderInfo) {
        if (this.options.overlap) {
            return true;
        } else if (this.options.arc) {
            return renderInfo.endAngle - renderInfo.startAngle <= renderInfo.totalAngle;
        } else {
            const metrics = this.measureLabel(label),
                left = renderInfo.x - metrics.width / 2,
                right = renderInfo.x + metrics.width / 2,
                top = renderInfo.y - metrics.height / 2,
                bottom = renderInfo.y + metrics.height / 2;
            if (this.options.position === 'outside') {
                return this.outsideInRange(left, right, top, bottom);
            } else {
                return element.inRange(left, top) && element.inRange(left, bottom) &&
                    element.inRange(right, top) && element.inRange(right, bottom);
            }
        }
    };

    OutsideLabel.prototype.outsideInRange = function (left, right, top, bottom) {
        const labelBounds = this.labelBounds;
        for (const label of labelBounds) {
            const bound = label;
            let points = [
                [left, top],
                [left, bottom],
                [right, top],
                [right, bottom]
            ];
            for (const point of points) {
                const x = point[0];
                const y = point[1];
                if (x >= bound.left && x <= bound.right && y >= bound.top && y <= bound.bottom) {
                    return false;
                }
            }
            points = [
                [bound.left, bound.top],
                [bound.left, bound.bottom],
                [bound.right, bound.top],
                [bound.right, bound.bottom]
            ];
            for (const point of points) {
                const x = point[0];
                const y = point[1];
                if (x >= left && x <= right && y >= top && y <= bottom) {
                    return false;
                }
            }
        }
        labelBounds.push({
            left: left,
            right: right,
            top: top,
            bottom: bottom
        });
        return true;
    };

    OutsideLabel.prototype.measureLabel = function (label) {
        if (typeof label === 'object') {
            return {width: label.width, height: label.height};
        } else {
            let width = 0;
            const lines = label.split('\n');
            for (const line of lines) {
                const result = this.ctx.measureText(line);
                if (result.width > width) {
                    width = result.width;
                }
            }
            return {width: width, height: this.options.fontSize * lines.length};
        }
    };

    Chart.plugins.register({
        id: 'outsideLabel',
        beforeDatasetsUpdate: function (chart, options) {
            if (!SUPPORTED_TYPES[chart.config.type]) {
                return;
            }
            if (!Array.isArray(options)) {
                options = [options];
            }
            const count = options.length;
            if (!chart._labels || count !== chart._labels.length) {
                chart._labels = options.map(function () {
                    return new OutsideLabel();
                });
            }
            let someOutside = false;
            let maxPadding = 0;
            for (let i = 0; i < count; ++i) {
                const label = chart._labels[i];
                label.setup(chart, options[i]);
                if (label.options.position === 'outside') {
                    someOutside = true;
                    const padding = label.options.fontSize * 1.5 + label.options.outsidePadding;
                    if (padding > maxPadding) {
                        maxPadding = padding;
                    }
                }
            }
            if (someOutside) {
                chart.chartArea.top += maxPadding;
                chart.chartArea.bottom -= maxPadding;
            }
        },
        afterDatasetUpdate: function (chart, args) {
            if (!SUPPORTED_TYPES[chart.config.type]) {
                return;
            }
            chart._labels.forEach(function (label) {
                label.args[args.index] = args;
            });
        },
        beforeDraw: function (chart) {
            if (!SUPPORTED_TYPES[chart.config.type]) {
                return;
            }
            chart._labels.forEach(function (label) {
                label.barTotalPercentage = {};
            });
        },
        afterDatasetsDraw: function (chart) {
            if (!SUPPORTED_TYPES[chart.config.type]) {
                return;
            }
            chart._labels.forEach(function (label) {
                label.render();
            });
        }
    });
})();
