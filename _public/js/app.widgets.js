
/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronApp.controller('AnnotationChartWidget', ['$scope', 'configService', 'cyclotronDataService', 'dashboardService', 'dataService', 'logService', function($scope, configService, cyclotronDataService, dashboardService, dataService, logService) {
  var dsDefinition, ref, ref1, themeOptions, widgetConfig;
  $scope.annotations = {
    data: [],
    popoverOpen: false
  };
  widgetConfig = configService.widgets.annotationChart;
  themeOptions = ((ref = widgetConfig.themes[$scope.widget.theme]) != null ? ref.options : void 0) || {};
  $scope.rangeChangeEventHandler = _.jsEval((ref1 = $scope.widget.events) != null ? ref1.rangechange : void 0);
  if (!_.isFunction($scope.rangeChangeEventHandler)) {
    $scope.rangeChangeEventHandler = null;
  }
  $scope.chartObject = {
    type: 'AnnotationChart',
    options: _.assign(_.cloneDeep(widgetConfig.options), themeOptions)
  };
  $scope.xAxisFormatter = (function() {
    switch ($scope.widget.xAxis.format) {
      case 'epoch':
        return function(d) {
          return moment.unix(d).toDate();
        };
      case 'epochmillis':
        return function(d) {
          return moment(d).toDate();
        };
      case 'string':
        return function(d) {
          if ($scope.widget.xAxis.formatString != null) {
            return moment(d, $scope.widget.xAxis.formatString).toDate();
          } else {
            return moment(d).toDate();
          }
        };
      default:
        return _.identity;
    }
  })();
  $scope.updateSeries = function() {
    return $scope.series = _.map($scope.widget.series, function(series) {
      var newSeries;
      newSeries = _.compile(series, {});
      newSeries.id = newSeries.column;
      if (newSeries.label == null) {
        newSeries.label = _.titleCase(newSeries.id);
      }
      newSeries.annotationTitleId = _.jsExec(series.annotationTitleColumn) || newSeries.id + '-title';
      newSeries.annotationTextId = _.jsExec(series.annotationTextColumn) || newSeries.id + '-text';
      return newSeries;
    });
  };
  $scope.updateChart = function(data) {
    var annotationEditing, chartData, optionsSeries, ref2, scaleColumns, secondaryAxis;
    if (!(($scope.widget.xAxis.column != null) && ($scope.widget.series != null))) {
      return;
    }
    logService.debug('Updating Annotation Chart');
    $scope.chartObject.options.rev += 1;
    annotationEditing = $scope.widget.annotationEditing === true;
    chartData = {
      cols: [],
      rows: []
    };
    secondaryAxis = null;
    $scope.xAxisId = _.jsExec($scope.widget.xAxis.column);
    $scope.updateSeries();
    if ($scope.widget.annotationEditing === true && ((ref2 = $scope.annotations.data) != null ? ref2.length : void 0) > 0) {
      _.each($scope.annotations.data, function(annotationDatum) {
        var match;
        match = _.find(data, function(d) {
          return d[$scope.xAxisId] === annotationDatum.x;
        });
        if (match != null) {
          return _.merge(match, annotationDatum);
        }
      });
    }
    chartData.cols.push({
      id: $scope.xAxisId,
      label: 'xAxisLabel',
      type: 'datetime'
    });
    optionsSeries = {};
    _.each($scope.series, function(series, index) {
      if (series.secondaryAxis === true) {
        secondaryAxis = index;
      }
      chartData.cols.push({
        id: series.id,
        label: series.label,
        type: 'number'
      });
      chartData.cols.push({
        id: series.annotationTitleId,
        label: series.id + '-title',
        type: 'string'
      });
      chartData.cols.push({
        id: series.annotationTextId,
        label: series.id + '-text',
        type: 'string'
      });
      optionsSeries[index] = {};
      if (series.lineDashStyle != null) {
        return optionsSeries[index].lineDashStyle = series.lineDashStyle;
      }
    });
    if (secondaryAxis != null) {
      scaleColumns = (function() {
        switch (secondaryAxis) {
          case 0:
            return [0, 1];
          default:
            return [secondaryAxis, 0];
        }
      })();
      $scope.chartObject.options.scaleColumns = scaleColumns;
    }
    chartData.rows = _.map(data, function(row) {
      return {
        c: _.map(chartData.cols, function(column) {
          if (column.type === 'datetime') {
            return {
              v: $scope.xAxisFormatter(row[column.id])
            };
          } else {
            return {
              v: row[column.id]
            };
          }
        })
      };
    });
    $scope.chartObject.data = chartData;
    _.merge($scope.chartObject.options, _.compile($scope.widget.options, {}));
    if ($scope.chartObject.options.focusTarget != null) {
      $scope.chartObject.options.chart.focusTarget = $scope.chartObject.options.focusTarget;
    }
    $scope.chartObject.options.chart.series = optionsSeries;
    if ($scope.widget.annotationEditing === true) {
      return $scope.chartObject.options.chart.focusTarget = 'datum';
    }
  };
  $scope.reload = function() {
    return $scope.dataSource.execute(true);
  };
  $scope.handleError = function(message) {
    return logService.error('Annotation Chart error: ' + message);
  };
  $scope.selectItem = function(selectedItem) {
    var existingAnnotation, selectedSeries, seriesId;
    if (_.isUndefined(selectedItem) || $scope.widget.annotationEditing !== true || _.isEmpty($scope.widget.annotationKey)) {
      $scope.selectedPoint = null;
      return;
    }
    seriesId = $scope.chartObject.data.cols[selectedItem.column].id;
    selectedSeries = _.find($scope.series, {
      id: seriesId
    });
    $scope.selectedPoint = {
      x: $scope.data[selectedItem.row][$scope.xAxisId],
      series: selectedSeries,
      value: $scope.chartObject.data.rows[selectedItem.row].c[selectedItem.column].v
    };
    existingAnnotation = _.find($scope.annotations.data, {
      x: $scope.selectedPoint.x
    });
    if ((existingAnnotation != null) && ((existingAnnotation[selectedSeries.annotationTitleId] != null) || (existingAnnotation[selectedSeries.annotationTextId] != null))) {
      $scope.annotations.isUpdate = true;
      $scope.annotations.verb = 'Edit';
      $scope.annotations.newAnnotationTitle = existingAnnotation[selectedSeries.annotationTitleId];
      $scope.annotations.newAnnotationText = existingAnnotation[selectedSeries.annotationTextId];
    } else {
      $scope.annotations.isUpdate = false;
      $scope.annotations.verb = 'Add';
    }
    return $scope.selectedPoint.existingAnnotation = existingAnnotation;
  };
  $scope.saveAnnotation = function() {
    var key, matchingKeys, newAnnotation, series;
    key = _.jsExec($scope.widget.annotationKey);
    series = $scope.selectedPoint.series;
    matchingKeys = {
      x: $scope.selectedPoint.x
    };
    if ($scope.selectedPoint.existingAnnotation != null) {
      $scope.selectedPoint.existingAnnotation[series.annotationTitleId] = $scope.annotations.newAnnotationTitle;
      $scope.selectedPoint.existingAnnotation[series.annotationTextId] = $scope.annotations.newAnnotationText;
      return cyclotronDataService.upsert(key, matchingKeys, $scope.selectedPoint.existingAnnotation).then(function() {
        logService.debug('Annotation Chart: edited existing annotation');
        $scope.selectedPoint = null;
        $scope.annotations.popoverOpen = false;
        $scope.annotations.newAnnotationTitle = null;
        $scope.annotations.newAnnotationText = null;
        return $scope.updateChart($scope.data);
      });
    } else {
      newAnnotation = {
        x: $scope.selectedPoint.x
      };
      newAnnotation[series.annotationTitleId] = $scope.annotations.newAnnotationTitle;
      newAnnotation[series.annotationTextId] = $scope.annotations.newAnnotationText;
      return cyclotronDataService.append(key, newAnnotation).then(function() {
        $scope.annotations.data.push(newAnnotation);
        logService.debug('Annotation Chart: appended new annotation');
        $scope.selectedPoint = null;
        $scope.annotations.popoverOpen = false;
        $scope.annotations.newAnnotationTitle = null;
        $scope.annotations.newAnnotationText = null;
        return $scope.updateChart($scope.data);
      })["catch"](logService.error);
    }
  };
  $scope.deleteAnnotation = function() {
    var key, matchingKeys, series;
    key = _.jsExec($scope.widget.annotationKey);
    series = $scope.selectedPoint.series;
    matchingKeys = {
      x: $scope.selectedPoint.x
    };
    delete $scope.selectedPoint.existingAnnotation[series.annotationTitleId];
    delete $scope.selectedPoint.existingAnnotation[series.annotationTextId];
    return cyclotronDataService.remove(key, matchingKeys).then(function() {
      return cyclotronDataService.upsert(key, matchingKeys, $scope.selectedPoint.existingAnnotation).then(function() {
        var dataRow;
        dataRow = _.find($scope.data, function(d) {
          return d[$scope.xAxisId] === $scope.selectedPoint.x;
        });
        if (dataRow != null) {
          delete dataRow[series.annotationTitleId];
          delete dataRow[series.annotationTextId];
        }
        logService.debug('Annotation Chart: deleted existing annotation');
        $scope.selectedPoint = null;
        $scope.annotations.popoverOpen = false;
        $scope.annotations.newAnnotationTitle = null;
        $scope.annotations.newAnnotationText = null;
        return $scope.updateChart($scope.data);
      });
    });
  };
  $scope.rangeChange = function(start, end) {
    if ($scope.rangeChangeEventHandler != null) {
      return $scope.rangeChangeEventHandler({
        start: start,
        end: end
      });
    }
  };
  dsDefinition = dashboardService.getDataSource($scope.dashboard, $scope.widget);
  $scope.dataSource = dataService.get(dsDefinition);
  if ($scope.dataSource != null) {
    $scope.dataVersion = 0;
    $scope.widgetContext.loading = true;
    $scope.$on('dataSource:' + dsDefinition.name + ':data', function(event, eventData) {
      var data;
      if (!(eventData.version > $scope.dataVersion)) {
        return;
      }
      $scope.dataVersion = eventData.version;
      $scope.widgetContext.dataSourceError = false;
      $scope.widgetContext.dataSourceErrorMessage = null;
      data = eventData.data[dsDefinition.resultSet].data;
      data = $scope.filterAndSortWidgetData(data);
      if (data != null) {
        $scope.data = data;
        $scope.updateChart(data);
      }
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':error', function(event, data) {
      $scope.widgetContext.dataSourceError = true;
      $scope.widgetContext.dataSourceErrorMessage = data.error;
      $scope.widgetContext.nodata = null;
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':loading', function() {
      return $scope.widgetContext.loading = true;
    });
    if ($scope.widget.annotationEditing === true && !_.isEmpty($scope.widget.annotationKey)) {
      return cyclotronDataService.getBucketData($scope.widget.annotationKey).then(function(annotationData) {
        $scope.annotations.data = annotationData || [];
        return $scope.dataSource.init(dsDefinition);
      });
    } else {
      return $scope.dataSource.init(dsDefinition);
    }
  }
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronApp.controller('ChartWidget', ['$scope', 'dashboardService', 'dataService', function($scope, dashboardService, dataService) {
  var drilldownDataSourceDefinition, dsDefinition, getChart, getSeries;
  getChart = function() {
    var chart, defaults;
    defaults = {
      credits: {
        enabled: false
      },
      exporting: {
        enabled: false
      },
      plotOptions: {},
      title: {
        text: null
      }
    };
    chart = _.merge(defaults, $scope.widget.highchart);
    chart = _.compile(chart, {}, ['series'], true);
    return chart;
  };
  getSeries = function(series, seriesData) {
    var xTransform;
    if (seriesData == null) {
      seriesData = $scope.rawData;
    }
    series = _.compile(series, [], [], false);
    if (series._x) {
      series.x = series._x;
    }
    if (series._y) {
      series.y = series._y;
    }
    if (series._z) {
      series.z = series._z;
    }
    if (series._point) {
      series.point = series._point;
    }
    xTransform = null;
    if (series.xFormat != null) {
      xTransform = (function() {
        switch (series.xFormat) {
          case 'epoch':
            return function(d) {
              return moment.unix(d).valueOf();
            };
          case 'epochmillis':
            return _.identity;
          case 'string':
            return function(d) {
              return moment(d).valueOf();
            };
          default:
            return _.identity;
        }
      })();
    }
    if (series.point != null) {
      series.data = _.map(seriesData, function(row) {
        var point;
        point = _.cloneDeep(series.point);
        if ((point.x == null) && (series.x != null)) {
          point.x = row[series.x];
        }
        if ((point.y == null) && (series.y != null)) {
          point.y = row[series.y];
        }
        if ((point.z == null) && (series.z != null)) {
          point.z = row[series.z];
        }
        point = _.compile(point, row, [], true, true);
        if ((point.x != null) && (xTransform != null)) {
          point.x = xTransform(point.x);
        }
        if (point.drilldown != null) {
          point.drilldown = point.drilldown.toString();
        }
        return point;
      });
      series._x = series.x;
      series._y = series.y;
      series._z = series.z;
      series._point = series.point;
      delete series.x;
      delete series.y;
      delete series.z;
      delete series.point;
    } else if ((series.x != null) && (series.y != null) && (series.z != null)) {
      series.data = _.map(seriesData, function(row) {
        var ref, ref1, ref2, xValue, yValue, zValue;
        xValue = (ref = row[series.x]) != null ? ref : null;
        yValue = (ref1 = row[series.y]) != null ? ref1 : null;
        zValue = (ref2 = row[series.z]) != null ? ref2 : null;
        if (xTransform != null) {
          xValue = xTransform(xValue);
        }
        return [xValue, yValue, zValue];
      });
    } else if ((series.x != null) && (series.y != null)) {
      series.data = _.map(seriesData, function(row) {
        var ref, ref1, xValue, yValue;
        xValue = (ref = row[series.x]) != null ? ref : null;
        yValue = (ref1 = row[series.y]) != null ? ref1 : null;
        if (xTransform != null) {
          xValue = xTransform(xValue);
        }
        return [xValue, yValue];
      });
    } else if ((series.x == null) && (series.y != null)) {
      series.data = _.map(seriesData, function(row) {
        var ref;
        return (ref = row[series.y]) != null ? ref : null;
      });
    } else if ((series.y == null) && (series.x != null)) {
      series.data = _.map(seriesData, function(row) {
        var ref, xValue;
        xValue = (ref = row[series.x]) != null ? ref : null;
        if (xTransform != null) {
          xValue = xTransform(xValue);
        }
        return xValue;
      });
    } else {
      series.data = [];
    }
    if (series._titleCase) {
      series.name = _.titleCase(series.name);
    }
    return series;
  };
  $scope.createChart = function() {
    var chart, expandedSeries, remainingSeries, series, stars;
    chart = getChart();
    $scope.series = series = chart.series;
    if (_.isNullOrUndefined(series)) {
      series = _.map($scope.headers, function(header) {
        return {
          type: 'line',
          y: header
        };
      });
    }
    _.each(series, function(s) {
      return s.name = _.jsExec(s.name);
    });
    stars = _.filter(series, function(s) {
      if (s.y == null) {
        return false;
      }
      return s.y === '*' || /^\/.*\/$/i.test(s.y);
    });
    if (stars != null) {
      remainingSeries = _.reject(series, function(s) {
        return _.contains(stars, s);
      });
      _.each(stars, function(star) {
        var r, starSeriesY;
        starSeriesY = _.reject($scope.headers, function(header) {
          if (star.yIgnore && _.contains(star.yIgnore, header)) {
            return true;
          }
          if (header === star.x || header === star.z) {
            return true;
          }
          if (_.some(remainingSeries, function(rem) {
            if (header === rem.x) {
              return true;
            }
            if (header === rem.y) {
              return true;
            }
            if (header === rem.z) {
              return true;
            }
            return false;
          })) {
            return true;
          }
        });
        if (/^\/.*\/$/i.test(star.y)) {
          r = new RegExp(star.y.substring(1, star.y.length - 1), "i");
          starSeriesY = _.filter(starSeriesY, function(y) {
            return r.test(y);
          });
        }
        return remainingSeries = _.union(remainingSeries, _.map(starSeriesY, function(y) {
          var expanded;
          expanded = _.defaults({
            y: y
          }, star);
          if (expanded.name != null) {
            if (_.isFunction(expanded.name)) {
              expanded.name = expanded.name(y);
            } else {
              expanded.name = expanded.name + ": " + _.titleCase(y);
            }
          }
          return expanded;
        }));
      });
      series = remainingSeries;
    }
    _.each(series, function(aSeries) {
      if (_.isNullOrUndefined(aSeries.name)) {
        aSeries.name = aSeries.y;
        return aSeries._titleCase = true;
      } else if (_.isFunction(aSeries.name)) {
        return aSeries.name = aSeries.name(aSeries.y);
      }
    });
    chart.series = _.map(series, function(s) {
      return getSeries(s, $scope.rawData);
    });
    if (chart.drilldown != null) {
      expandedSeries = _.map(chart.drilldown.series, function(drilldownSeries) {
        var groups;
        groups = _.groupBy($scope.drilldownData, function(row) {
          return _.compile(drilldownSeries.key, row);
        });
        return _.map(groups, function(group, key) {
          var s;
          s = getSeries(_.cloneDeep(drilldownSeries), group);
          s.id = key.toString();
          return s;
        });
      });
      chart.drilldown.series = _.flatten(expandedSeries);
    }
    return $scope.highchart = chart;
  };
  $scope.reload = function() {
    if ($scope.dataSource) {
      return $scope.dataSource.execute(true);
    }
  };
  dsDefinition = dashboardService.getDataSource($scope.dashboard, $scope.widget);
  $scope.dataSource = dataService.get(dsDefinition);
  if ($scope.dataSource != null) {
    $scope.dataVersion = 0;
    $scope.widgetContext.loading = true;
    $scope.$on('dataSource:' + dsDefinition.name + ':data', function(event, eventData) {
      var data, previousHeaders;
      if (!(eventData.version > $scope.dataVersion)) {
        return;
      }
      $scope.dataVersion = eventData.version;
      $scope.widgetContext.dataSourceError = false;
      $scope.widgetContext.dataSourceErrorMessage = null;
      data = eventData.data[dsDefinition.resultSet].data;
      data = $scope.filterAndSortWidgetData(data);
      if (data != null) {
        $scope.rawData = data;
        previousHeaders = $scope.headers;
        $scope.headers = _.reduce(data, function(headers, dataRow) {
          return _.union(headers, _.keys(dataRow));
        }, []);
        $scope.createChart();
      }
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':error', function(event, data) {
      $scope.widgetContext.dataSourceError = true;
      $scope.widgetContext.dataSourceErrorMessage = data.error;
      $scope.widgetContext.nodata = null;
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':loading', function() {
      return $scope.widgetContext.loading = true;
    });
    $scope.dataSource.init(dsDefinition);
  }
  drilldownDataSourceDefinition = dashboardService.getDataSource($scope.dashboard, $scope.widget, 'drilldownDataSource');
  $scope.drilldownDataSource = dataService.get(drilldownDataSourceDefinition);
  if ($scope.drilldownDataSource != null) {
    $scope.$on('dataSource:' + drilldownDataSourceDefinition.name + ':data', function(event, eventData) {
      $scope.drilldownData = eventData.data[dsDefinition.resultSet].data;
      return $scope.createChart();
    });
    return $scope.drilldownDataSource.init(drilldownDataSourceDefinition);
  }
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
Highcharts.setOptions({
  global: {
    useUTC: false
  },
  lang: {
    numericSymbols: ['k', 'm', 'b', 't', 'qd', 'qt']
  },
  tooltip: {
    shared: true
  }
});

cyclotronDirectives.directive('highchart', ['configService', function(configService) {
  return {
    restrict: 'CA',
    replace: false,
    scope: {
      chart: '=',
      theme: '=',
      addshift: '='
    },
    link: function(scope, element, attrs) {
      var $element, $parent, $title, chartConfig, chartDefaults, highchartsObj, resize, resizeFunction;
      $element = $(element);
      $parent = $element.parent();
      $title = $parent.children('h1');
      highchartsObj = null;
      resize = function() {
        var parentHeight;
        parentHeight = $parent.height();
        if ($title.length) {
          $element.height(parentHeight - $title.height());
        } else {
          $element.height(parentHeight);
        }
        if (highchartsObj != null) {
          return highchartsObj.setSize($parent.width(), $element.height(), false);
        }
      };
      chartDefaults = {
        chart: {
          renderTo: element[0],
          height: attrs.height || null,
          width: attrs.width || null
        }
      };
      chartConfig = configService.widgets.chart;
      scope.$watch('chart', function(chart) {
        var newChart, seriesToRemove;
        if (!chart) {
          return;
        }
        resize();
        if ((highchartsObj != null) && _.isEqual(_.omit(scope.currentChart, 'series'), _.omit(chart, 'series'))) {
          seriesToRemove = [];
          _.each(highchartsObj.series, function(aSeries) {
            var newPoints, newSeries, originalSeries, willShift;
            newSeries = _.find(chart.series, {
              name: aSeries.name
            });
            if (newSeries == null) {
              seriesToRemove.push(aSeries);
              return;
            }
            if (scope.addshift) {
              originalSeries = _.find(scope.chartSeries, {
                name: aSeries.name
              });
              willShift = originalSeries.data.length === newSeries.data.length;
              newPoints = _.reject(newSeries.data, function(newPoint) {
                return _.any(originalSeries.data, function(oldPoint) {
                  return _.isEqual(oldPoint, newPoint);
                });
              });
              return _.each(newPoints, function(newPoint) {
                return aSeries.addPoint(newPoint, false, willShift, true);
              });
            } else {
              return aSeries.setData(newSeries.data, false);
            }
          });
          _.each(chart.series, function(toSeries, index) {
            var existingSeries;
            existingSeries = _.find(highchartsObj.series, {
              name: toSeries.name
            });
            if (existingSeries == null) {
              return highchartsObj.addSeries(toSeries, false);
            }
          });
          _.each(seriesToRemove, function(aSeries) {
            return aSeries.remove(false);
          });
          return highchartsObj.redraw();
        } else {
          if (highchartsObj != null) {
            highchartsObj.destroy();
          }
          newChart = _.cloneDeep(chart);
          scope.currentChart = chart;
          if (scope.theme != null) {
            Highcharts.setOptions(chartConfig.themes[scope.theme]);
          }
          _.merge(newChart, chartDefaults, _["default"]);
          scope.chartSeries = newChart.series;
          return highchartsObj = new Highcharts.Chart(newChart);
        }
      }, true);
      resizeFunction = _.debounce(resize, 100, {
        leading: false,
        maxWait: 300
      });
      $(window).on('resize', resizeFunction);
      scope.$on('$destroy', function() {
        $(window).off('resize', resizeFunction);
        if (highchartsObj != null) {
          highchartsObj.destroy();
          return highchartsObj = null;
        }
      });
    }
  };
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronApp.controller('ClockWidget', ['$scope', '$interval', 'configService', function($scope, $interval, configService) {
  $scope.widgetContext.allowExport = false;
  $scope.format = configService.widgets.clock.properties.format["default"];
  $scope.timezone = null;
  if (!_.isEmpty($scope.widget.format)) {
    $scope.format = _.jsExec($scope.widget.format);
  }
  if (!_.isEmpty($scope.widget.timezone)) {
    if (moment.tz.zone($scope.widget.timezone)) {
      $scope.timezone = _.jsExec($scope.widget.timezone);
    } else {
      $scope.widgetContext.dataSourceError = true;
      $scope.widgetContext.dataSourceErrorMessage = '"' + _.jsExec($scope.widget.timezone + '" is not a valid time zone');
    }
  }
  $scope.updateTime = function() {
    var temp;
    temp = moment();
    if ($scope.timezone != null) {
      temp = temp.tz($scope.timezone);
    }
    return $scope.currentTime = temp.format($scope.format);
  };
  $scope.updateTime();
  $scope.interval = $interval($scope.updateTime, 1000);
  return $scope.$on('$destroy', function() {
    if ($scope.interval != null) {
      $interval.cancel($scope.interval);
      return $scope.interval = null;
    }
  });
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronDirectives.directive('htmlRepeater', ['$compile', 'layoutService', function($compile, layoutService) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      scope.$watch(attrs.htmlRepeater, function(htmlStrings) {
        var compiledValue, template;
        template = '';
        _.each(htmlStrings, function(html) {
          return template += html;
        });
        compiledValue = $compile(template)(scope);
        element.contents().remove();
        return element.append(compiledValue);
      });
    }
  };
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronApp.controller('HtmlWidget', ['$scope', 'dashboardService', 'dataService', function($scope, dashboardService, dataService) {
  var dsDefinition;
  $scope.htmlStrings = [];
  if ($scope.widget.preHtml != null) {
    $scope.preHtml = _.jsExec($scope.widget.preHtml);
  }
  if ($scope.widget.postHtml != null) {
    $scope.postHtml = _.jsExec($scope.widget.postHtml);
  }
  $scope.reload = function() {
    return $scope.dataSource.execute(true);
  };
  dsDefinition = dashboardService.getDataSource($scope.dashboard, $scope.widget);
  $scope.dataSource = dataService.get(dsDefinition);
  if ($scope.dataSource != null) {
    $scope.dataVersion = 0;
    $scope.widgetContext.loading = true;
    $scope.$on('dataSource:' + dsDefinition.name + ':data', function(event, eventData) {
      var data, dataCopy;
      if (!(eventData.version > $scope.dataVersion)) {
        return;
      }
      $scope.dataVersion = eventData.version;
      $scope.widgetContext.dataSourceError = false;
      $scope.widgetContext.dataSourceErrorMessage = null;
      data = eventData.data[dsDefinition.resultSet].data;
      data = $scope.filterAndSortWidgetData(data);
      if ($scope.widgetContext.nodata === true) {
        $scope.htmlStrings = [];
      } else {
        dataCopy = _.cloneDeep(data);
        _.each(dataCopy, function(row, index) {
          return row.__index = index;
        });
        $scope.htmlStrings = _.map(dataCopy, _.partial(_.compile, $scope.widget.html));
        if ($scope.preHtml != null) {
          $scope.htmlStrings.unshift($scope.preHtml);
        }
        if ($scope.postHtml != null) {
          $scope.htmlStrings.push($scope.postHtml);
        }
      }
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':error', function(event, data) {
      $scope.widgetContext.dataSourceError = true;
      $scope.widgetContext.dataSourceErrorMessage = data.error;
      $scope.widgetContext.nodata = null;
      $scope.widgetContext.loading = false;
      return $scope.htmlStrings = [];
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':loading', function() {
      return $scope.widgetContext.loading = true;
    });
    return $scope.dataSource.init(dsDefinition);
  } else {
    $scope.widgetContext.allowExport = false;
    if ($scope.widget.html != null) {
      if ($scope.preHtml != null) {
        $scope.htmlStrings.push($scope.preHtml);
      }
      $scope.htmlStrings.push(_.jsExec($scope.widget.html));
      if ($scope.postHtml != null) {
        return $scope.htmlStrings.push($scope.postHtml);
      }
    }
  }
}]);


/*
 * Copyright (c) 2016 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronDirectives.directive('headerParameter', ['$window', 'dashboardService', 'dataService', 'logService', function($window, dashboardService, dataService, logService) {
  return {
    restrict: 'CA',
    scope: {
      dashboard: '=',
      parameterDefinition: '='
    },
    replace: true,
    templateUrl: '/widgets/header/headerParameter.html',
    controller: ['$scope', function($scope) {
      var dsDefinition, originalValue, ref, ref1, ref2, ref3, ref4;
      originalValue = $window.Cyclotron.parameters[$scope.parameterDefinition.name];
      $scope.parameter = {
        displayName: ((ref = $scope.parameterDefinition.editing) != null ? ref.displayName : void 0) || $scope.parameterDefinition.name,
        editorType: (ref1 = $scope.parameterDefinition.editing) != null ? ref1.editorType : void 0,
        value: originalValue
      };
      switch ($scope.parameter.editorType) {
        case 'datetime':
          $scope.parameter.datetimeOptions = {
            datepicker: true,
            timepicker: true
          };
          if (((ref2 = $scope.parameterDefinition.editing) != null ? ref2.datetimeFormat : void 0) != null) {
            $scope.parameter.datetimeOptions.datetimeFormat = $scope.parameterDefinition.editing.datetimeFormat;
          } else {
            $scope.parameter.datetimeOptions.datetimeFormat = 'YYYY-MM-DD HH:mm';
          }
          break;
        case 'date':
          $scope.parameter.datetimeOptions = {
            datepicker: true,
            timepicker: false
          };
          if (((ref3 = $scope.parameterDefinition.editing) != null ? ref3.datetimeFormat : void 0) != null) {
            $scope.parameter.datetimeOptions.datetimeFormat = $scope.parameterDefinition.editing.datetimeFormat;
          } else {
            $scope.parameter.datetimeOptions.datetimeFormat = 'YYYY-MM-DD';
          }
          break;
        case 'time':
          $scope.parameter.datetimeOptions = {
            datepicker: false,
            timepicker: true
          };
          if (((ref4 = $scope.parameterDefinition.editing) != null ? ref4.datetimeFormat : void 0) != null) {
            $scope.parameter.datetimeOptions.datetimeFormat = $scope.parameterDefinition.editing.datetimeFormat;
          } else {
            $scope.parameter.datetimeOptions.datetimeFormat = 'HH:mm';
          }
      }
      $scope.selectValue = function(value) {
        $scope.parameter.value = value;
        return $scope.updateParameter();
      };
      $scope.updateParameter = function() {
        if (!_.isEqual($scope.parameter.value, originalValue)) {
          $window.Cyclotron.parameters[$scope.parameterDefinition.name] = $scope.parameter.value;
          originalValue = $scope.parameter.value;
          return logService.debug('Header Widget:', 'Updated Parameter [' + $scope.parameterDefinition.name + ']:', $scope.parameter.value);
        }
      };
      dsDefinition = dashboardService.getDataSource($scope.dashboard, $scope.parameterDefinition.editing);
      $scope.dataSource = dataService.get(dsDefinition);
      if ($scope.dataSource != null) {
        $scope.dataVersion = 0;
        $scope.loading = true;
        $scope.$on('dataSource:' + dsDefinition.name + ':data', function(event, eventData) {
          if (!(eventData.version > $scope.dataVersion)) {
            return;
          }
          $scope.dataVersion = eventData.version;
          $scope.dataSourceData = eventData.data[dsDefinition.resultSet].data;
          return $scope.loading = false;
        });
        $scope.dataSource.init(dsDefinition);
      }
    }]
  };
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronApp.controller('HeaderWidget', ['$scope', '$sce', 'configService', function($scope, $sce, configService) {
  var ref, updateEventHandler;
  $scope.widgetContext.allowExport = false;
  $scope.headerTitle = _.compile($scope.widget.headerTitle);
  if ($scope.headerTitle.showTitle === true) {
    $scope.showTitle = true;
    $scope.title = _.jsExec($scope.widget.title) || _.jsExec($scope.dashboard.displayName) || $scope.dashboard.name;
    if ($scope.pageNameSeparator == null) {
      $scope.pageNameSeparator = '';
    }
  }
  if ($scope.widget.customHtml != null) {
    $scope.showCustomHtml = true;
    $scope.customHtml = function() {
      return $sce.trustAsHtml(_.jsExec($scope.widget.customHtml));
    };
  }
  $scope.showParameters = ((ref = $scope.widget.parameters) != null ? ref.showParameters : void 0) === true;
  if ($scope.showParameters) {
    $scope.showUpdateButton = $scope.widget.parameters.showUpdateButton;
    $scope.updateButtonLabel = $scope.widget.parameters.updateButtonLabel || 'Update';
    $scope.parameters = _.filter($scope.dashboard.parameters, {
      editInHeader: true
    });
    if (_.isArray($scope.widget.parameters.parametersIncluded) && $scope.widget.parameters.parametersIncluded.length > 0) {
      $scope.parameters = _.filter($scope.parameters, function(param) {
        return _.contains($scope.widget.parameters.parametersIncluded, param.name);
      });
    }
    updateEventHandler = _.jsEval($scope.widget.parameters.updateEvent);
    if (!_.isFunction(updateEventHandler)) {
      updateEventHandler = null;
    }
    return $scope.updateButtonClick = function() {
      if (!_.isNull(updateEventHandler)) {
        return updateEventHandler();
      }
    };
  }
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronDirectives.directive('jsContainer', ['$interval', 'configService', function($interval, configService) {
  return {
    restrict: 'EAC',
    scope: {
      jsObject: '=',
      data: '=',
      refresh: '='
    },
    link: function(scope, element, attrs) {
      var $element, $parent, eventName, intervalFn, intervalPromise, resize, resizeEvent;
      $element = $(element);
      $parent = $element.parent();
      intervalPromise = null;
      resize = function() {
        var parentHeight, title;
        parentHeight = $parent.height();
        title = $parent.children('h1');
        if (title.length) {
          return $element.height(parentHeight - title.height());
        } else {
          return $element.height(parentHeight);
        }
      };
      resize();
      if (scope.jsObject.onCreate != null) {
        scope.jsObject.onCreate($element, scope.data);
      }
      if (scope.jsObject.onData != null) {
        scope.$watch('data', function(data) {
          return scope.jsObject.onData($element, data);
        });
      }
      if ((scope.refresh != null) && scope.refresh > 0) {
        eventName = scope.jsObject.onRefresh != null ? 'onRefresh' : 'onData';
        if (scope.jsObject[eventName] != null) {
          intervalFn = function() {
            return scope.jsObject[eventName]($element, scope.data);
          };
          intervalPromise = $interval(intervalFn, scope.refresh * 1000, 0, false);
        }
      }
      resizeEvent = function() {
        resize();
        if (scope.jsObject.onResize != null) {
          return scope.jsObject.onResize($element, scope.data);
        }
      };
      $parent.resize(_.throttle(resizeEvent, 200, {
        leading: false,
        trailing: true
      }));
      scope.$on('$destroy', function() {
        var $container;
        if (typeof $container !== "undefined" && $container !== null) {
          $container.remove();
          $container = null;
        }
        if (intervalPromise != null) {
          $interval.cancel(intervalPromise);
          intervalPromise = null;
        }
        $parent.off('resize');
        $parent.off('scroll');
      });
    }
  };
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronApp.controller('JavascriptWidget', ['$scope', 'dashboardService', 'dataService', function($scope, dashboardService, dataService) {
  var dsDefinition;
  $scope.jsObject = _.executeFunctionByName($scope.widget.functionName, window, $scope.widget);
  $scope.reload = function() {
    return $scope.dataSource.execute(true);
  };
  dsDefinition = dashboardService.getDataSource($scope.dashboard, $scope.widget);
  $scope.dataSource = dataService.get(dsDefinition);
  if ($scope.dataSource != null) {
    $scope.dataVersion = 0;
    $scope.widgetContext.loading = true;
    $scope.$on('dataSource:' + dsDefinition.name + ':data', function(event, eventData) {
      var data;
      if (!(eventData.version > $scope.dataVersion)) {
        return;
      }
      $scope.dataVersion = eventData.version;
      $scope.widgetContext.dataSourceError = false;
      $scope.widgetContext.dataSourceErrorMessage = null;
      data = eventData.data[dsDefinition.resultSet].data;
      if (_.isEmpty(data)) {
        $scope.widgetContext.loading = false;
        return;
      }
      data = $scope.filterAndSortWidgetData(data);
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':error', function(event, data) {
      $scope.widgetContext.dataSourceError = true;
      $scope.widgetContext.dataSourceErrorMessage = data.error;
      $scope.widgetContext.nodata = null;
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':loading', function() {
      return $scope.widgetContext.loading = true;
    });
    return $scope.dataSource.init(dsDefinition);
  }
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronDirectives.directive('fancyImage', ['$interval', function($interval) {
  return {
    restrict: 'A',
    scope: {
      image: '='
    },
    link: function(scope, element, attrs) {
      var $element;
      $element = $(element);
      return scope.$watch('image', function(image) {
        $element.css({
          'background-image': 'url(' + image.url + ')',
          'background-size': image.backgroundSize || 'cover',
          'background-repeat': image.backgroundRepeat || 'no-repeat',
          'background-position': image.backgroundPosition || 'center'
        });
        if (image.backgroundColor != null) {
          $element.css('background-color', image.backgroundColor);
        }
        if (image.filters != null) {
          return $element.css('filter', image.filters);
        }
      });
    }
  };
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronApp.controller('ImageWidget', ['$scope', '$interval', function($scope, $interval) {
  $scope.widgetContext.allowExport = false;
  $scope.duration = $scope.widget.duration * 1000;
  $scope.urlIndex = -1;
  $scope.loadCurrentImage = function() {
    var ref;
    $scope.currentImage = _.compile((ref = $scope.widget.images) != null ? ref[$scope.urlIndex] : void 0);
    if (($scope.currentImage.url != null) && $scope.currentImage.url.indexOf('http') !== 0) {
      $scope.currentImage.url = 'http://' + $scope.currentImage.url;
    }
    return $scope.link = $scope.currentImage.link;
  };
  $scope.linkTarget = function() {
    if ($scope.dashboard.openLinksInNewWindow === false) {
      return '_self';
    } else {
      return '_blank';
    }
  };
  $scope.rotate = function() {
    $scope.urlIndex = $scope.urlIndex + 1;
    if ($scope.urlIndex >= $scope.widget.images.length) {
      $scope.urlIndex = 0;
    }
    return $scope.loadCurrentImage();
  };
  $scope.rotate();
  if ($scope.duration > 0 && $scope.widget.images.length > 1) {
    $scope.rotateInterval = $interval($scope.rotate, $scope.duration);
  }
  return $scope.$on('$destroy', function() {
    if ($scope.rotateInterval != null) {
      $interval.cancel($scope.rotateInterval);
      return $scope.rotateInterval = null;
    }
  });
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronDirectives.directive('iframerefresh', ['$interval', function($interval) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      var intervalFn, intervalPromise, refresh;
      refresh = parseInt(attrs.iframerefresh);
      if (!isNaN(refresh)) {
        intervalFn = function() {
          return $(element).attr('src', function(i, val) {
            return val;
          });
        };
        intervalPromise = $interval(intervalFn, 1000 * attrs.iframerefresh, 0, false);
        return scope.$on('$destroy', function() {
          return $interval.cancel(intervalPromise);
        });
      }
    }
  };
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronApp.controller('IframeWidget', ['$scope', function($scope) {
  $scope.widgetContext.allowExport = false;
  return $scope.getUrl = function() {
    var url;
    if (_.isEmpty($scope.widget.url)) {
      return '';
    }
    url = $scope.widget.url;
    if (url.indexOf('http') !== 0) {
      url = 'http://' + url;
    }
    return $scope.$sce.trustAsResourceUrl(url);
  };
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronDirectives.directive('qrcode', function() {
  return {
    restrict: 'C',
    scope: {
      options: '='
    },
    link: function(scope, element, attrs) {
      var $element, $widget, makeCode, resizeFunction;
      $element = $(element);
      $widget = $element.parent().parent();
      makeCode = _.throttle(function() {
        var options, size;
        options = _.clone(scope.options);
        options.correctLevel = QRCode.CorrectLevel.H;
        size = Math.min($widget.width(), $widget.height());
        if (options.maxSize != null) {
          size = Math.min(size, options.maxSize);
        }
        options.width = size;
        options.height = size;
        element.css('width', size + 'px');
        element.css('height', size + 'px');
        element.css('margin-top', ($widget.height() - size) / 2 + 'px');
        element.empty();
        return new QRCode(element[0], options);
      }, 75);
      scope.$watch('options', function(options) {
        return makeCode();
      });
      resizeFunction = _.debounce(makeCode, 100, {
        leading: false,
        maxWait: 300
      });
      $widget.on('resize', resizeFunction);
      return scope.$on('$destroy', function() {
        $widget.off('resize', resizeFunction);
      });
    }
  };
});


/*
 * Copyright (c) 2013-2016 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronApp.controller('QRCodeWidget', ['$scope', '$location', 'dashboardService', 'dataService', function($scope, $location, dashboardService, dataService) {
  var dsDefinition;
  $scope.compileCode = function(row) {
    var text;
    if ($scope.widget.useUrl === true) {
      text = $location.absUrl();
      $scope.widgetContext.allowExport = false;
    } else {
      text = _.compile($scope.widget.text, row);
    }
    return $scope.options = {
      text: text,
      maxSize: _.compile($scope.widget.maxSize, row),
      colorDark: _.compile($scope.widget.colorDark, row) || '#000000',
      colorLight: _.compile($scope.widget.colorLight, row) || '#ffffff'
    };
  };
  dsDefinition = dashboardService.getDataSource($scope.dashboard, $scope.widget);
  $scope.dataSource = dataService.get(dsDefinition);
  if ($scope.dataSource != null) {
    $scope.dataVersion = 0;
    $scope.widgetContext.loading = true;
    $scope.$on('dataSource:' + dsDefinition.name + ':data', function(event, eventData) {
      var data;
      if (!(eventData.version > $scope.dataVersion)) {
        return;
      }
      $scope.dataVersion = eventData.version;
      $scope.widgetContext.dataSourceError = false;
      $scope.widgetContext.dataSourceErrorMessage = null;
      data = eventData.data[dsDefinition.resultSet].data;
      data = $scope.filterAndSortWidgetData(data);
      if (data != null) {
        $scope.compileCode(data[0]);
      }
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':error', function(event, data) {
      $scope.widgetContext.dataSourceError = true;
      $scope.widgetContext.dataSourceErrorMessage = data.error;
      $scope.widgetContext.nodata = null;
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':loading', function() {
      return $scope.widgetContext.loading = true;
    });
    return $scope.dataSource.init(dsDefinition);
  } else if ($scope.widget.useUrl === true) {
    return $scope.$watch((function() {
      return $location.absUrl();
    }), function() {
      return $scope.compileCode({});
    });
  } else {
    return $scope.compileCode({});
  }
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronDirectives.directive('trafficlight', ['$timeout', function($timeout) {
  return {
    restrict: 'C',
    scope: {
      activeColor: '='
    },
    link: function(scope, element, attrs) {
      var $element, $inner, $lights, $protectors, $widgetBody, sizer;
      $element = $(element);
      $widgetBody = $element.parent();
      $inner = $element.children('.trafficlight-inner');
      $protectors = $element.children('.protector');
      $lights = $inner.children('.light');
      sizer = function() {
        var height, protectorHeight, protectorPadding, protectorWidth, width;
        height = $element.height();
        width = height / 3;
        $element.width(width);
        $inner.css({
          'border-radius': width / 4 + 'px',
          'border-width': width / 19
        });
        protectorWidth = width / 5;
        protectorPadding = Math.floor(height / 12.0);
        protectorHeight = Math.floor(height - (protectorPadding * 4)) / 3.0;
        if (height < 150) {
          protectorHeight *= 0.9;
        }
        if ($widgetBody.width() < width + protectorWidth * 2) {
          $protectors.hide();
        } else {
          $protectors.show();
          $protectors.css({
            'width': width + (protectorWidth * 2) + 'px',
            'left': -protectorWidth + 'px',
            'border-left': 'solid ' + protectorWidth + 'px transparent',
            'border-right': 'solid ' + protectorWidth + 'px transparent',
            'border-top': 'solid ' + protectorHeight + 'px #111'
          });
          $protectors.first().css('top', protectorPadding + 'px').next().css('top', (protectorHeight + 2 * protectorPadding) + 'px').next().css('top', (2 * protectorHeight + 3 * protectorPadding) + 'px');
        }
        $lights.width(protectorHeight);
        $lights.height(protectorHeight);
        $lights.css('margin-bottom', (protectorPadding * .9) + 'px');
        $lights.first().css('margin-top', (protectorPadding - width / 15) + 'px');
        if (protectorPadding < 12) {
          $lights.css({
            'background-image': 'none',
            'box-shadow': 'none'
          });
          $inner.find('.red').css('border-color', '#A52A2A');
          return $inner.find('.yellow').css('border-color', '#FFFF00');
        } else {
          $inner.find('.red').css({
            'background-image': 'radial-gradient(brown, transparent)',
            'box-shadow': '0 0 ' + protectorPadding / 1.3 + 'px #111 inset, 0 0 10px red',
            'border-color': 'red'
          });
          $inner.find('.yellow').css({
            'background-image': 'radial-gradient(gold, transparent)',
            'box-shadow': '0 0 ' + protectorPadding / 1.3 + 'px #111 inset, 0 0 10px yellow',
            'border-color': 'yellow'
          });
          return $inner.find('.green').css({
            'background-image': 'radial-gradient(lime, transparent)',
            'box-shadow': '0 0 ' + protectorPadding / 1.3 + 'px #111 inset, 0 0 10px green'
          });
        }
      };
      $widgetBody.on('resize', _.debounce(sizer, 100, {
        leading: false,
        maxWait: 300
      }));
      $timeout(sizer, 10);
      scope.$watch('activeColor', function(color) {
        $lights.removeClass('active');
        return $inner.find('.' + color).addClass('active');
      });
      return scope.$on('$destroy', function() {
        return $widgetBody.off('resize');
      });
    }
  };
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronApp.controller('StoplightWidget', ['$scope', 'dashboardService', 'dataService', function($scope, dashboardService, dataService) {
  var dsDefinition;
  $scope.activeColor = null;
  $scope.evalColors = function(row) {
    var green, red, rules, yellow;
    rules = $scope.widget.rules;
    if (rules == null) {
      return;
    }
    $scope.tooltip = _.compile($scope.widget.tooltip, row);
    if (rules.red != null) {
      red = _.compile(rules.red, row);
      if (red === true) {
        return $scope.activeColor = 'red';
      }
    }
    if (rules.yellow != null) {
      yellow = _.compile(rules.yellow, row);
      if (yellow === true) {
        return $scope.activeColor = 'yellow';
      }
    }
    if (rules.green) {
      green = _.compile(rules.green, row);
      if (green === true) {
        return $scope.activeColor = 'green';
      }
      return;
    }
    return $scope.activeColor = null;
  };
  $scope.reload = function() {
    return $scope.dataSource.execute(true);
  };
  dsDefinition = dashboardService.getDataSource($scope.dashboard, $scope.widget);
  $scope.dataSource = dataService.get(dsDefinition);
  if ($scope.dataSource != null) {
    $scope.dataVersion = 0;
    $scope.widgetContext.loading = true;
    $scope.$on('dataSource:' + dsDefinition.name + ':data', function(event, eventData) {
      var data;
      if (!(eventData.version > $scope.dataVersion)) {
        return;
      }
      $scope.dataVersion = eventData.version;
      $scope.widgetContext.dataSourceError = false;
      $scope.widgetContext.dataSourceErrorMessage = null;
      data = eventData.data[dsDefinition.resultSet].data;
      data = $scope.filterAndSortWidgetData(data);
      if (data != null) {
        $scope.evalColors(_.first(data));
      }
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':error', function(event, data) {
      $scope.widgetContext.dataSourceError = true;
      $scope.widgetContext.dataSourceErrorMessage = data.error;
      $scope.widgetContext.nodata = null;
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':loading', function() {
      return $scope.widgetContext.loading = true;
    });
    return $scope.dataSource.init(dsDefinition);
  } else {
    $scope.widgetContext.allowExport = false;
    return $scope.evalColors({});
  }
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronDirectives.directive('theNumber', ['$timeout', function($timeout) {
  return {
    restrict: 'C',
    scope: {
      numberCount: '=',
      isHorizontal: '=',
      index: '=',
      autoSize: '='
    },
    link: function(scope, element, attrs) {
      var $element, $widgetBody, resizeFunction, sizer;
      $element = $(element);
      $widgetBody = $element.parent();
      sizer = function() {
        var currentHeight, currentWidth, fontSize, h1, iterations, numberHeight, numberWidth, sizeMe, sizePrefixSuffix, spanFontSize, spans, totalHeight, widgetBodyHeight, widgetBodyWidth;
        widgetBodyHeight = $widgetBody.height();
        widgetBodyWidth = $widgetBody.width();
        if (widgetBodyHeight === 0) {
          return;
        }
        numberWidth = widgetBodyWidth;
        numberHeight = widgetBodyHeight;
        if (scope.numberCount === 2) {
          if (scope.isHorizontal) {
            numberWidth = widgetBodyWidth / 2;
            numberHeight = widgetBodyHeight;
          } else {
            numberWidth = widgetBodyWidth;
            numberHeight = widgetBodyHeight / 2;
          }
        } else if (scope.numberCount === 3) {
          if (scope.index < 2) {
            numberWidth = widgetBodyWidth / 2;
            numberHeight = widgetBodyHeight / 2;
          } else {
            numberWidth = widgetBodyWidth;
            numberHeight = widgetBodyHeight / 2;
          }
        } else if (scope.numberCount === 4) {
          numberWidth = widgetBodyWidth / 2;
          numberHeight = widgetBodyHeight / 2;
        }
        if (scope.numberCount <= 4 && scope.autoSize !== false) {
          $element.addClass('auto-sized');
          $element.css('width', Math.floor(numberWidth) + 'px');
          $element.css('height', Math.floor(numberHeight) + 'px');
          $widgetBody.css('overflow-y', 'hidden');
          h1 = $element.find('h1');
          spans = $element.find('span');
          if (scope.isHorizontal) {
            h1.css('display', 'inline-block');
            spans.css('display', 'inline-block');
          }
          fontSize = Math.min(102, numberHeight / 2);
          iterations = 0;
          currentWidth = 0;
          currentHeight = 0;
          sizeMe = function() {
            h1.css('font-size', fontSize + 'px');
            h1.css('line-height', fontSize + 'px');
            spans.css('font-size', fontSize * 0.75 + 'px');
            iterations++;
            currentWidth = 0;
            if (scope.isHorizontal) {
              currentWidth = h1.width();
            } else {
              $element.children().each(function() {
                return currentWidth += $(this).width();
              });
            }
            currentHeight = 0;
            if (scope.isHorizontal) {
              return $element.children().each(function() {
                return currentHeight += $(this).height();
              });
            } else {
              return currentHeight = h1.height();
            }
          };
          sizeMe();
          while (((currentWidth + 25 >= numberWidth || h1.height() > fontSize * 2) || currentHeight > numberHeight) && iterations < 25) {
            fontSize -= 4;
            sizeMe();
          }
          if (scope.isHorizontal) {
            iterations = 0;
            spanFontSize = Math.min(fontSize * 0.70, 40);
            sizePrefixSuffix = function() {
              spans.css('font-size', spanFontSize + 'px');
              iterations++;
              spanFontSize -= 4;
              currentWidth = 0;
              return spans.each(function() {
                return currentWidth = Math.max(currentWidth, $(this).width());
              });
            };
            sizePrefixSuffix();
            while (currentWidth + 15 >= numberWidth && iterations < 15) {
              sizePrefixSuffix();
            }
            h1.css('display', 'block');
            totalHeight = 0;
            $element.children().each(function() {
              return totalHeight += $(this).height();
            });
            return $element.css('padding-top', (numberHeight - totalHeight) / 2.0 + 'px');
          } else {
            return h1.css('line-height', numberHeight - fontSize / 2.0 + 'px');
          }
        } else {

        }
      };
      resizeFunction = _.debounce(sizer, 100, {
        leading: false,
        maxWait: 300
      });
      $widgetBody.on('resize', resizeFunction);
      $timeout(sizer, 10);
      return scope.$on('$destroy', function() {
        $widgetBody.off('resize', resizeFunction);
      });
    }
  };
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronApp.controller('NumberWidget', ['$scope', 'dashboardService', 'dataService', function($scope, dashboardService, dataService) {
  var dsDefinition, ref, ref1;
  $scope.orientation = (ref = $scope.widget.orientation) != null ? ref : 'vertical';
  $scope.numberCount = ((ref1 = $scope.widget.numbers) != null ? ref1.length : void 0) || 0;
  $scope.isHorizontal = $scope.widget.orientation === 'horizontal';
  if ($scope.numberCount <= 4 && $scope.widget.autoSize !== false) {
    $scope.isHorizontal = !$scope.isHorizontal;
  }
  $scope.linkTarget = function() {
    if ($scope.dashboard.openLinksInNewWindow === false) {
      return '_self';
    } else {
      return '_blank';
    }
  };
  $scope.getClass = function(number) {
    var c;
    c = '';
    if ($scope.isHorizontal) {
      c = 'orientation-horizontal';
    } else {
      c = 'orientation-vertical';
    }
    if (_.isFunction(number.onClick)) {
      c += ' actionable';
    }
    return c;
  };
  $scope.getUrl = function() {
    var url;
    if (_.isEmpty($scope.widget.link)) {
      return '';
    }
    url = $scope.widget.link;
    if ($scope.widget.link.indexOf('http') !== 0) {
      url = 'http://' + url;
    }
    return $scope.$sce.trustAsResourceUrl(url);
  };
  $scope.compileNumbers = function(row) {
    var numbers;
    numbers = _.map($scope.widget.numbers, function(item, index) {
      return {
        number: _.compile(item.number, row),
        prefix: _.compile(item.prefix, row),
        suffix: _.compile(item.suffix, row),
        color: _.compile(item.color, row),
        tooltip: _.compile(item.tooltip, row),
        icon: _.compile(item.icon, row),
        iconColor: _.compile(item.iconColor, row),
        iconTooltip: _.compile(item.iconTooltip, row),
        onClick: _.jsEval(_.compile(item.onClick, row))
      };
    });
    if ($scope.numbers != null) {
      return _.each(numbers, function(number, index) {
        return _.assign($scope.numbers[index], number);
      });
    } else {
      return $scope.numbers = numbers;
    }
  };
  $scope.onClickEvent = function(number) {
    if (_.isFunction(number.onClick)) {
      return number.onClick({
        number: number
      });
    }
  };
  $scope.reload = function() {
    return $scope.dataSource.execute(true);
  };
  dsDefinition = dashboardService.getDataSource($scope.dashboard, $scope.widget);
  $scope.dataSource = dataService.get(dsDefinition);
  if ($scope.dataSource != null) {
    $scope.dataVersion = 0;
    $scope.widgetContext.loading = true;
    $scope.$on('dataSource:' + dsDefinition.name + ':data', function(event, eventData) {
      var data;
      if (!(eventData.version > $scope.dataVersion)) {
        return;
      }
      $scope.dataVersion = eventData.version;
      $scope.widgetContext.dataSourceError = false;
      $scope.widgetContext.dataSourceErrorMessage = null;
      data = eventData.data[dsDefinition.resultSet].data;
      data = $scope.filterAndSortWidgetData(data);
      if (data != null) {
        $scope.compileNumbers(data[0]);
      }
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':error', function(event, data) {
      $scope.widgetContext.dataSourceError = true;
      $scope.widgetContext.dataSourceErrorMessage = data.error;
      $scope.widgetContext.nodata = null;
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':loading', function() {
      return $scope.widgetContext.loading = true;
    });
    return $scope.dataSource.init(dsDefinition);
  } else {
    $scope.widgetContext.allowExport = false;
    return $scope.compileNumbers({});
  }
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronDirectives.directive('tableauWidget', function() {
  return {
    restrict: 'CA',
    link: function($scope, element, $attrs) {
      var $element;
      $element = $(element);
      $scope.actualHeight = $element.height();
      return $scope.actualWidth = $element.width();
    }
  };
});


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronApp.controller('TableauWidget', ['$scope', function($scope) {
  $scope.widgetContext.allowExport = false;
  $scope.params = [];
  if (!_.isUndefined($scope.widget.params)) {
    return $scope.params = _.map(_.keys($scope.widget.params), function(key) {
      return {
        name: key,
        value: $scope.widget.params[key]
      };
    });
  }
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronDirectives.directive('tableColumn', function() {
  return {
    restrict: 'CA',
    link: function(scope, element, attrs) {
      var border;
      border = scope.column.border;
      if (border != null) {
        if (border.indexOf('left') >= 0) {
          $(element).css('border-left-width', '1px');
        }
        if (border.indexOf('right') >= 0) {
          return $(element).css('border-right-width', '1px');
        }
      }
    }
  };
});


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronDirectives.directive('tableFixedHeader', ['$window', 'configService', function($window, configService) {
  return {
    restrict: 'EAC',
    link: function(scope, element, attrs) {
      var $clonedTable, $container, $table, $tableHeaders, $widgetBody, pos, resize;
      if (!((attrs.tableFixedHeader != null) && scope.$eval(attrs.tableFixedHeader) === true)) {
        return;
      }
      $table = $(element);
      $tableHeaders = null;
      $widgetBody = $table.parents('.widget-body');
      $container = $('<div id="container"></div>').appendTo($widgetBody);
      pos = {
        originalTop: 0,
        originalLeft: $table.position().left
      };
      $container.css({
        'overflow': 'hidden',
        'position': 'absolute',
        'top': 0,
        'left': $table.position().left
      }).hide();
      $clonedTable = $table.clone().empty();
      $clonedTable.css({
        'position': 'relative'
      }).appendTo($container);
      if (scope.columnGroups.length === 0) {
        $clonedTable.css('table-layout', 'fixed');
      }
      resize = function() {
        var $headerRows;
        $tableHeaders = $table.children('thead');
        $headerRows = $tableHeaders.children('tr');
        pos.originalTop = $widgetBody.position().top;
        pos.originalLeft = $table.offset().left;
        $container.css({
          width: $widgetBody[0].clientWidth,
          height: $tableHeaders.height(),
          top: pos.originalTop
        });
        return $clonedTable.empty().width($table.outerWidth()).append($tableHeaders.clone()).find('tr').each(function(index) {
          var height;
          height = $headerRows.eq(index).height();
          $(this).css('height', height);
          return $(this).find('th').each(function(thIndex) {
            var originalHeader;
            originalHeader = $headerRows.eq(index).find('th').eq(thIndex);
            return $(this).css({
              width: originalHeader.width()
            });
          });
        });
      };
      $widgetBody.on('resize', _.throttle(resize, 250, {
        leading: false,
        maxWait: 500
      }));
      scope.$watchGroup(['sortBy', 'sortedRows'], _.throttle(resize, 200, {
        leading: false,
        trailing: true
      }));
      $widgetBody.on('scroll', _.debounce(function() {
        var diff, elementTop, scrollTop;
        scrollTop = $widgetBody.scrollTop();
        elementTop = $tableHeaders.offset().top;
        diff = pos.originalTop - elementTop;
        $container.css('top', pos.originalTop);
        if (scrollTop > 0) {
          $clonedTable.css({
            'left': -$widgetBody.scrollLeft()
          });
          if (!scope.visible) {
            resize();
            $container.show();
            return scope.visible = true;
          }
        } else {
          $container.hide();
          return scope.visible = false;
        }
      }, 120, {
        leading: false,
        maxWait: 200
      }));
      scope.$on('$destroy', function() {
        if ($container != null) {
          $container.remove();
          $container = null;
        }
        $widgetBody.off('resize');
        $widgetBody.off('scroll');
      });
    }
  };
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronDirectives.directive('tableRow', function() {
  return {
    restrict: 'CA',
    link: function(scope, element, attrs) {
      var $element, $widgetBody;
      $element = $(element);
      $widgetBody = $element.parents('.widget-body');
      if (scope.widget.rowHeight != null) {
        return $element.height(scope.widget.rowHeight + 'px');
      }
    }
  };
});


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
var indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

cyclotronDirectives.directive('tableRule', function() {
  return {
    restrict: 'CA',
    link: function(scope, element, attrs) {
      var $element, rules;
      $element = $(element);
      rules = scope.row.__matchingRules;
      return _.each(rules, function(rule) {
        return _.each(_.keys(rule), function(key) {
          var ref, value;
          if (key === 'columns' || key === 'rule' || key === 'text') {
            return;
          }
          value = rule[key];
          if (_.isNullOrUndefined(rule.columnsAffected)) {
            return $element.css(key, _.compile(value, scope.row));
          } else if (!_.isNullOrUndefined(scope.column)) {
            if (ref = scope.column.name, indexOf.call(rule.columnsAffected, ref) >= 0) {
              value = _.valSub(value, scope.row[scope.column.name]);
              value = _.compile(value, scope.row);
              return $element.css(key, value);
            }
          }
        });
      });
    }
  };
});


/*
 * Copyright (c) 2013-2016 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronApp.controller('TableWidget', ['$scope', '$location', '$window', 'dashboardService', 'dataService', 'logService', function($scope, $location, $window, dashboardService, dataService, logService) {
  var dsDefinition, getRuleProperty, onSort, ref, sortFunction;
  $scope.columnGroups = [];
  sortFunction = _.jsEval($scope.widget.sortFunction);
  onSort = _.jsEval($scope.widget.onSort);
  $scope.paging = {
    boundaryLinks: true,
    maxSize: 5,
    currentPage: 1,
    itemsPerPage: 1000
  };
  if ((ref = $scope.widget.pagination) != null ? ref.enabled : void 0) {
    $scope.paging.itemsPerPage = $scope.widget.pagination.itemsPerPage;
  }
  if ($scope.widget.name != null) {
    $window.Cyclotron.currentPage.widgets[$scope.widget.name].goToPage = function(pageNumber) {
      return $scope.$evalAsync(function() {
        return $scope.paging.currentPage = 1;
      });
    };
  }
  $scope.linkTarget = function(column) {
    if (column.openLinksInNewWindow != null) {
      if (column.openLinksInNewWindow === false) {
        return '_self';
      } else {
        return '_blank';
      }
    } else {
      if ($scope.dashboard.openLinksInNewWindow === false) {
        return '_self';
      } else {
        return '_blank';
      }
    }
  };
  getRuleProperty = function(row, column, property, defaultValue) {
    var rules, value;
    if (row.__matchingRules != null) {
      rules = _.filter(row.__matchingRules, function(rule) {
        if (rule.columnsAffected == null) {
          return true;
        }
        return _.contains(rule.columnsAffected, column.name);
      });
      value = _.last(_.compact(_.pluck(rules, property)));
      if (value != null) {
        return _.compile(value, row);
      }
    }
    return _.compile(defaultValue, row);
  };
  $scope.sortBy = $scope.widget.sortBy;
  $scope.selectSort = function(columnName) {
    var descending, enableDefaultSort, result;
    enableDefaultSort = true;
    descending = columnName === $scope.sortBy;
    if (_.isFunction(onSort)) {
      result = onSort({
        columnName: columnName,
        descending: descending
      });
      if (result === false) {
        enableDefaultSort = false;
      }
    }
    if (enableDefaultSort) {
      if (descending) {
        return $scope.sortBy = '-' + columnName;
      } else {
        return $scope.sortBy = columnName;
      }
    }
  };
  $scope.isSorted = function(columnName, ascending) {
    var sortlist;
    if (_.isNullOrUndefined($scope.sortBy)) {
      return false;
    }
    sortlist = $scope.sortBy;
    if (_.isString($scope.sortBy)) {
      sortlist = [$scope.sortBy];
    }
    return _.some(_.map(sortlist, dataService.parseSortBy), {
      columnName: columnName,
      ascending: ascending
    });
  };
  $scope.getCellProperty = function(row, column, propertyName) {
    var ruleValue;
    ruleValue = getRuleProperty(row, column, propertyName);
    if (ruleValue != null) {
      return ruleValue;
    }
    if (propertyName in column) {
      return _.compile(column[propertyName], row);
    }
    return null;
  };
  $scope.getText = function(row, column) {
    var columnName, numeralFormat, ruleName, ruleText;
    ruleText = getRuleProperty(row, column, 'text');
    if (ruleText != null) {
      return ruleText;
    }
    ruleName = getRuleProperty(row, column, 'name');
    columnName = ruleName != null ? ruleName : column.name;
    numeralFormat = getRuleProperty(row, column, 'numeralformat', column.numeralformat);
    if (column.text != null) {
      return _.compile(column.text, row);
    } else if (numeralFormat != null) {
      return _.numeralformat(numeralFormat, row[columnName]);
    } else {
      return row[columnName];
    }
  };
  $scope.isCellHidden = function(row, column, rowIndex) {
    if (rowIndex === 0) {
      return false;
    }
    return $scope.getRowSpan(row, column, rowIndex) === 0;
  };
  $scope.getRowSpan = function(row, column, rowIndex) {
    if (row.__rowSpans == null) {
      return 1;
    }
    if (rowIndex === 0) {
      return row.__rowSpanPos[column.name];
    }
    return row.__rowSpans[column.name];
  };
  $scope.sortRows = function() {
    var result;
    if ($scope.sortedRows != null) {
      if (sortFunction != null) {
        result = sortFunction($scope.sortedRows, $scope.sortBy, dataService.sort);
        if (_.isArray(result)) {
          $scope.sortedRows = result;
        }
      } else {
        dataService.sort($scope.sortedRows, $scope.sortBy);
      }
      return $scope.processRowGroups($scope.sortedRows, $scope.columns);
    }
  };
  $scope.processRules = function(rows, rules) {
    if (rules == null) {
      return;
    }
    return _.each(rows, function(row) {
      var columnExps, columnNames, varSubObj;
      row.__matchingRules = [];
      columnNames = _.keys(row);
      columnExps = _.map(columnNames, function(columnName) {
        return 'row["' + columnName + '"]';
      });
      varSubObj = _.zipObject(columnNames, columnExps);
      return _.each(rules, function(rule) {
        var columnsAffected, matchingRule, ruleExp, ruleTest;
        try {
          ruleExp = _.compile(rule.rule, row);
          ruleTest = eval(ruleExp);
          if (_.isBoolean(ruleTest) && ruleTest === true) {
            matchingRule = _.omit(rule, 'rule');
            columnsAffected = rule.columns;
            if (rule.columnsIgnored != null) {
              if (columnsAffected == null) {
                columnsAffected = _.pluck($scope.columns, 'name');
              }
              columnsAffected = _.difference(columnsAffected, rule.columnsIgnored);
            }
            matchingRule.columnsAffected = columnsAffected;
            return row.__matchingRules.push(matchingRule);
          }
        } catch (error) {
          logService.error('Table Widget: Error in rule: ' + rule.rule);
        }
      });
    });
  };
  $scope.processRowGroups = function(rows, columns) {
    return _.each(columns, function(column, columnIndex) {
      var currentGroupList, currentGroupValue;
      currentGroupList = [];
      currentGroupValue = null;
      return _.each(rows, function(row, rowIndex) {
        var spanLength;
        if (row.__rowSpans == null) {
          row.__rowSpans = {};
          row.__rowSpanPos = {};
        }
        if (column.groupRows !== true) {
          return row.__rowSpans[column.name] = 1;
        } else if (rowIndex === 0) {
          row.__rowSpans[column.name] = 1;
          row.__rowSpanPos[column.name] = 1;
          currentGroupList = [row];
          return currentGroupValue = row[column.name];
        } else {
          if (row[column.name] === currentGroupValue) {
            currentGroupList.push(row);
            currentGroupList[0].__rowSpans[column.name]++;
            spanLength = currentGroupList[0].__rowSpans[column.name];
            _.each(currentGroupList, function(row, index) {
              return row.__rowSpanPos[column.name] = spanLength - index;
            });
            return row.__rowSpans[column.name] = 0;
          } else {
            row.__rowSpans[column.name] = 1;
            row.__rowSpanPos[column.name] = 1;
            currentGroupList = [row];
            return currentGroupValue = row[column.name];
          }
        }
      });
    });
  };
  $scope.expandColumns = function(columns, headers) {
    var expandedColumns, pushColumns, usedHeaders;
    expandedColumns = [];
    usedHeaders = ['__index'];
    pushColumns = function(columnTemplate, columnsToAdd) {
      if (columnTemplate.columnSortFunction != null) {
        sortFunction = _.jsExec(columnTemplate.columnSortFunction);
        if (_.isFunction(sortFunction)) {
          columnsToAdd = sortFunction(columnsToAdd);
        }
      }
      return _.each(columnsToAdd, function(columnToAdd) {
        var newColumn;
        newColumn = _.cloneDeep(columnTemplate);
        newColumn.name = columnToAdd;
        expandedColumns.push(newColumn);
        return usedHeaders.push(columnToAdd);
      });
    };
    _.each(columns, function(column) {
      var matchingColumns, regex, remainingColumns;
      if (column.name === '*') {
        remainingColumns = _.difference(headers, usedHeaders);
        if (column.columnsIgnored != null) {
          remainingColumns = _.difference(remainingColumns, column.columnsIgnored);
        }
        return pushColumns(column, remainingColumns);
      } else if (/^\/.*\/$/i.test(column.name)) {
        try {
          regex = new RegExp(column.name.substring(1, column.name.length - 1), 'i');
        } catch (error) {
          logService.error('Table Widget: Error in column regex: ' + column.name);
          return;
        }
        remainingColumns = _.difference(headers, usedHeaders);
        if (column.columnsIgnored != null) {
          remainingColumns = _.difference(remainingColumns, column.columnsIgnored);
        }
        matchingColumns = _.filter(remainingColumns, function(column) {
          return regex.test(column);
        });
        return pushColumns(column, matchingColumns);
      } else {
        expandedColumns.push(column);
        if (column.name != null) {
          return usedHeaders.push(column.name);
        }
      }
    });
    return expandedColumns;
  };
  $scope.reload = function() {
    return $scope.dataSource.execute(true);
  };
  $scope.calculateItemsPerPage = function(bodyHeight) {
    var rowHeight;
    rowHeight = $scope.widget.rowHeight != null ? $scope.widget.rowHeight : 45;
    return $scope.paging.itemsPerPage = Math.floor(bodyHeight / rowHeight) - 5;
  };
  $scope.getBelowPagerMessage = function() {
    return _.compile($scope.widget.pagination.belowPagerMessage, $scope.paging);
  };
  $scope.onClickEvent = function(row, column) {
    if (_.isFunction(column.onClick)) {
      return column.onClick({
        row: row,
        column: column,
        text: $scope.getText(row, column)
      });
    }
  };
  dsDefinition = dashboardService.getDataSource($scope.dashboard, $scope.widget);
  $scope.dataSource = dataService.get(dsDefinition);
  if ($scope.dataSource != null) {
    $scope.dataVersion = 0;
    $scope.widgetContext.loading = true;
    $scope.$on('dataSource:' + dsDefinition.name + ':data', function(event, eventData) {
      var columns, currentGroup, data, headers, isUpdate;
      if (!(eventData.version > $scope.dataVersion)) {
        return;
      }
      $scope.dataVersion = eventData.version;
      $scope.widgetContext.dataSourceError = false;
      $scope.widgetContext.dataSourceErrorMessage = null;
      data = eventData.data[dsDefinition.resultSet].data;
      isUpdate = eventData.isUpdate;
      data = $scope.filterAndSortWidgetData(data);
      data = _.cloneDeep(data);
      _.each(data, function(row, index) {
        return row.__index = index;
      });
      if (!isUpdate || ($scope.columns == null)) {
        if (_.isNullOrUndefined(headers)) {
          headers = _.keys(_.omit(data[0], '$$hashKey'));
        }
        columns = angular.copy($scope.widget.columns);
        if (_.isNullOrUndefined(columns)) {
          columns = _.map(headers, function(header) {
            return {
              name: header
            };
          });
        }
        currentGroup = {
          name: null,
          length: 0
        };
        columns = $scope.expandColumns(columns, headers);
        _.each(columns, function(column) {
          if (_.isNullOrUndefined(column.label)) {
            column.label = _.titleCase(column.name);
          } else {
            column.label = _.jsExec(_.valSub(column.label, column.name));
          }
          if (!_.isNullOrUndefined(column.headerTooltip)) {
            column.headerTooltip = _.jsExec(_.valSub(column.headerTooltip, column.name));
          }
          if (column.group != null) {
            column.group = _.jsExec(column.group);
            if (column.group === currentGroup.name) {
              currentGroup.length++;
            } else {
              $scope.columnGroups.push(currentGroup);
              currentGroup = {
                name: column.group,
                length: 1
              };
            }
          } else {
            if (_.isNull(currentGroup.name)) {
              currentGroup.length++;
            } else {
              $scope.columnGroups.push(currentGroup);
              currentGroup = {
                name: null,
                length: 1
              };
            }
          }
          return column.onClick = _.jsEval(column.onClick);
        });
        if ($scope.columnGroups.length > 0 || (currentGroup.name != null)) {
          $scope.columnGroups.push(currentGroup);
        }
        $scope.columns = columns;
      }
      $scope.processRules(data, $scope.widget.rules);
      $scope.sortedRows = data;
      $scope.sortRows();
      $scope.paging.totalItems = $scope.sortedRows.length;
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':error', function(event, data) {
      $scope.widgetContext.dataSourceError = true;
      $scope.widgetContext.dataSourceErrorMessage = data.error;
      $scope.widgetContext.nodata = null;
      $scope.sortedRows = null;
      $scope.columns = null;
      $scope.widgetContext.data = null;
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':loading', function() {
      return $scope.widgetContext.loading = true;
    });
    $scope.$watch('sortBy', $scope.sortRows, true);
    $scope.dataSource.init(dsDefinition);
  }
  return $scope.$watch('widgetLayout.widgetBodyHeight', function(height) {
    var ref1;
    if (((ref1 = $scope.widget.pagination) != null ? ref1.autoItemsPerPage : void 0) === true) {
      return $scope.calculateItemsPerPage(height);
    }
  }, true);
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronDirectives.directive('treemap', ['$window', function($window) {
  var getContrast50;
  getContrast50 = function(hexcolor) {
    if ((hexcolor != null ? hexcolor.replace : void 0) == null) {
      return '#333333';
    }
    if (parseInt(hexcolor.replace('#', ''), 16) > 0xffffff / 3) {
      return 'black';
    } else {
      return 'white';
    }
  };
  return {
    restrict: 'C',
    scope: {
      data: '=',
      labelProperty: '=',
      valueProperty: '=',
      valueFormat: '=',
      valueDescription: '=',
      colorProperty: '=',
      colorDescription: '=',
      colorFormat: '=',
      colorStops: '=',
      showLegend: '=',
      legendHeight: '='
    },
    link: function(scope, element, attrs) {
      var $element, $widgetBody, accumulate, d3, display, footer, formatColorNumber, formatValueNumber, grandparent, header, headerIcon, headerText, height, initialize, initializeColors, layout, legend, margin, name, rect, resize, svg, svgInner, text, transition, treemap, width, x, y;
      d3 = $window.d3;
      $element = $(element);
      $widgetBody = $element.parent();
      margin = {
        top: 30,
        right: 0,
        bottom: 0,
        left: 0
      };
      initializeColors = function() {
        var colorRange;
        scope.colorDomain = _.map(_.pluck(scope.colorStops, 'value'), parseFloat);
        colorRange = _.pluck(scope.colorStops, 'color');
        if (_.isEmpty(scope.colorProperty) || _.isEmpty(scope.colorStops) || scope.colorStops.length < 2) {
          scope.showLegend = false;
          scope.useColor = false;
        } else {
          scope.useColor = true;
        }
        margin.bottom = scope.showLegend ? scope.legendHeight : 0;
        return scope.colorScale = d3.scale.linear().domain(scope.colorDomain).range(colorRange);
      };
      initializeColors();
      width = null;
      height = null;
      x = null;
      y = null;
      formatValueNumber = function(value) {
        return numeral(value).format(scope.valueFormat);
      };
      formatColorNumber = function(value) {
        return numeral(value).format(scope.colorFormat);
      };
      treemap = d3.layout.treemap().children(function(d, depth) {
        if (depth) {
          return null;
        } else {
          return d._children;
        }
      }).sort(function(a, b) {
        return a.value - b.value;
      }).round(false);
      svg = d3.select(element[0]).append('svg');
      svgInner = svg.append('g').style('shape-rendering', 'crispEdges');
      grandparent = svgInner.append('g').attr('class', 'grandparent');
      header = grandparent.append('rect');
      headerText = grandparent.append('text');
      headerIcon = grandparent.append('text').attr('class', 'icon').attr('opacity', 0).text('\uf0e2');
      headerIcon.append('title').text('Click to return');
      footer = svg.append('g').attr('class', 'footer');
      if (scope.showLegend) {
        legend = footer.append('g').attr('class', 'legend');
      }
      resize = function() {
        var adjWidth, colorIncrements, legendBoxCount, legendBoxes, legendItemWidth, newLegendBoxes, num, parentHeight, title;
        parentHeight = $widgetBody.height();
        title = $widgetBody.children('h1');
        if (title.length) {
          $element.height(parentHeight - title.height());
        } else {
          $element.height(parentHeight);
        }
        width = $widgetBody.width();
        height = $element.height() - margin.top - margin.bottom;
        treemap.ratio(height / width * 0.5 * (1 + Math.sqrt(5)));
        svg.attr('width', width + margin.left + margin.right).attr('height', height + margin.bottom + margin.top).style('margin-left', -margin.left + 'px').style('margin-right', -margin.right + 'px');
        svgInner.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        header.attr('y', -margin.top).attr('width', width).attr('height', margin.top);
        headerText.attr('x', 6).attr('y', 10 - margin.top).attr('dy', '.75em');
        headerIcon.attr('x', width - 20).attr('y', 10 - margin.top).attr('dy', '.75em');
        footer.attr('width', width + margin.left + margin.right).attr('height', margin.bottom).attr('transform', 'translate(' + margin.left + ',' + (height + margin.top) + ')');
        x = d3.scale.linear().domain([0, width]).range([0, width]);
        y = d3.scale.linear().domain([0, height]).range([0, height]);
        svg.classed('monochrome', !scope.useColor);
        if (scope.showLegend) {
          adjWidth = width - 2;
          legendBoxCount = Math.floor(adjWidth / 40);
          legendItemWidth = adjWidth / legendBoxCount;
          legendBoxes = legend.selectAll('g').data((function() {
            var i, ref, results;
            results = [];
            for (num = i = 0, ref = legendBoxCount - 1; 0 <= ref ? i <= ref : i >= ref; num = 0 <= ref ? ++i : --i) {
              results.push(num);
            }
            return results;
          })());
          newLegendBoxes = legendBoxes.enter().append('g');
          newLegendBoxes.append('rect');
          newLegendBoxes.append('text');
          colorIncrements = function(d) {
            return (scope.colorDomain[scope.colorDomain.length - 1] - scope.colorDomain[0]) / (legendBoxCount - 1) * d + scope.colorDomain[0];
          };
          legendBoxes.selectAll('rect').attr('fill', function(d) {
            return scope.colorScale(colorIncrements(d));
          }).attr('x', function(d) {
            return 1 + margin.left + d * legendItemWidth;
          }).attr('y', 0).attr('width', legendItemWidth).attr('height', margin.bottom);
          return legendBoxes.selectAll('text').text(function(d) {
            return formatColorNumber(colorIncrements(d));
          }).attr('y', Math.floor(margin.bottom * .66)).attr('x', function(d) {
            return 1 + margin.left + d * legendItemWidth + (legendItemWidth / 2.0);
          });
        } else if (legend != null) {
          return legend.selectAll('g').remove();
        }
      };
      initialize = function(root) {
        root.x = root.y = 0;
        root.dx = width;
        root.dy = height;
        return root.depth = 0;
      };
      accumulate = function(d) {
        var fn, v;
        d._children = d.children;
        if (d.children != null) {
          fn = function(p, v) {
            return p + accumulate(v);
          };
          return d.value = d.children.reduce(fn, 0);
        } else {
          v = d[scope.valueProperty];
          if (!_.isNumber(v)) {
            v = parseFloat(v);
          }
          return d.value = v;
        }
      };
      layout = function(d) {
        if (d._children) {
          treemap.nodes({
            _children: d._children
          });
          return d._children.forEach(function(c) {
            c.x = d.x + c.x * d.dx;
            c.y = d.y + c.y * d.dy;
            c.dx *= d.dx;
            c.dy *= d.dy;
            c.parent = d;
            return layout(c);
          });
        }
      };
      transition = function(g1, d) {
        var g2, t1, t2, undoOpacity;
        if (scope.transitioning || (d == null)) {
          return;
        }
        scope.transitioning = true;
        g2 = display(d);
        t1 = g1.transition().duration(750);
        t2 = g2.transition().duration(750);
        x.domain([d.x, d.x + d.dx]);
        y.domain([d.y, d.y + d.dy]);
        svgInner.style('shape-rendering', null);
        svgInner.selectAll('.depth').sort(function(a, b) {
          return a.depth - b.depth;
        });
        g2.selectAll('text').style('fill-opacity', 0);
        t1.selectAll('text').call(text).style('fill-opacity', 0);
        t2.selectAll('text').call(text).style('fill-opacity', 1);
        t1.selectAll('rect').call(rect);
        t2.selectAll('rect').call(rect);
        undoOpacity = d.parent ? 1 : 0;
        headerIcon.transition().duration(750).attr('opacity', undoOpacity);
        return t1.remove().each('end', function() {
          svgInner.style('shape-rendering', 'crispEdges');
          return scope.transitioning = false;
        });
      };
      display = function(d) {
        var g, g1;
        g1 = svgInner.insert('g', '.grandparent').datum(d).attr('class', 'depth');
        g = g1.selectAll('g').data(d._children).enter().append('g');
        g.filter(function(d) {
          return d._children;
        }).classed('children', true).on('click', _.partial(transition, g1));
        g.selectAll('.child').data(function(d) {
          return d._children || [d];
        }).enter().append('rect').attr('class', 'child').call(rect);
        g.append('rect').attr('class', 'parent').call(rect).append('title').text(function(d) {
          if (scope.useColor) {
            return d[scope.labelProperty] + ', ' + scope.valueDescription + ': ' + formatValueNumber(d.value) + ', ' + scope.colorDescription + ': ' + formatColorNumber(d[scope.colorProperty]);
          } else {
            return d[scope.labelProperty] + ', ' + scope.valueDescription + ': ' + formatValueNumber(d.value);
          }
        });
        g.append('clipPath').attr('id', function(d) {
          return 'clip-path-' + _.slugify(d[scope.labelProperty]);
        }).append('rect').call(rect, 2);
        g.append('text').attr('dy', '.75em').text(function(d) {
          return d[scope.labelProperty];
        }).attr('clip-path', function(d) {
          return 'url(#clip-path-' + _.slugify(d[scope.labelProperty]);
        }).call(text);
        grandparent.datum(d.parent).on('click', _.partial(transition, g1)).select('text').text(name(d)).attr('fill', function() {
          if (scope.useColor) {
            return getContrast50(scope.colorScale(d[scope.colorProperty]));
          } else {
            return '#333333';
          }
        });
        grandparent.datum(d.parent).select('rect').attr('fill', function() {
          if (scope.useColor) {
            return scope.colorScale(d[scope.colorProperty]);
          } else {
            return '#bbbbbb';
          }
        });
        return g;
      };
      text = function(text) {
        return text.attr('x', function(d) {
          return x(d.x) + 6;
        }).attr('y', function(d) {
          return y(d.y) + 6;
        }).attr('fill', function(d) {
          if (scope.useColor) {
            return getContrast50(scope.colorScale(parseFloat(d[scope.colorProperty])));
          } else {
            return '#333333';
          }
        });
      };
      rect = function(rect, heightWidthOffset) {
        if (heightWidthOffset == null) {
          heightWidthOffset = 0;
        }
        rect.attr('x', function(d) {
          return x(d.x);
        }).attr('y', function(d) {
          return y(d.y);
        }).attr('width', function(d) {
          return x(d.x + d.dx) - x(d.x) - heightWidthOffset;
        }).attr('height', function(d) {
          return y(d.y + d.dy) - y(d.y) - heightWidthOffset;
        });
        if (scope.useColor) {
          return rect.attr('fill', function(d) {
            return scope.colorScale(parseFloat(d[scope.colorProperty]));
          });
        } else {
          return rect.attr('fill', null);
        }
      };
      name = function(d) {
        if (d.parent) {
          return name(d.parent) + ', ' + d[scope.labelProperty];
        } else {
          return d[scope.labelProperty];
        }
      };
      scope.$watch('data', function(root) {
        if (root == null) {
          return;
        }
        initializeColors();
        resize();
        initialize(root);
        accumulate(root);
        layout(root);
        d3.select(_.last(svgInner.selectAll('.depth')[0])).remove();
        return display(root);
      });
      $widgetBody.on('resize', _.debounce(function() {
        resize();
        initialize(scope.data);
        layout(scope.data);
        d3.select(_.last(svgInner.selectAll('.depth')[0])).remove();
        return display(scope.data);
      }, 100, {
        leading: false,
        maxWait: 300
      }));
      scope.$on('$destroy', function() {
        $widgetBody.off('resize');
      });
    }
  };
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronApp.controller('TreemapWidget', ['$scope', 'dashboardService', 'dataService', function($scope, dashboardService, dataService) {
  var dsDefinition;
  $scope.legendHeight = $scope.widget.legendHeight || 30;
  $scope.reload = function() {
    return $scope.dataSource.execute(true);
  };
  dsDefinition = dashboardService.getDataSource($scope.dashboard, $scope.widget);
  $scope.dataSource = dataService.get(dsDefinition);
  if ($scope.dataSource != null) {
    $scope.dataVersion = 0;
    $scope.widgetContext.loading = true;
    $scope.$on('dataSource:' + dsDefinition.name + ':data', function(event, eventData) {
      var data;
      if (!(eventData.version > $scope.dataVersion)) {
        return;
      }
      $scope.dataVersion = eventData.version;
      $scope.widgetContext.dataSourceError = false;
      $scope.widgetContext.dataSourceErrorMessage = null;
      data = eventData.data[dsDefinition.resultSet].data;
      data = $scope.filterAndSortWidgetData(data);
      if (data != null) {
        $scope.labelProperty = _.jsExec($scope.widget.labelProperty);
        if (_.isEmpty($scope.labelProperty)) {
          $scope.labelProperty = 'name';
        }
        $scope.valueProperty = _.jsExec($scope.widget.valueProperty);
        if (_.isEmpty($scope.valueProperty)) {
          $scope.valueProperty = 'value';
        }
        $scope.valueDescription = _.jsExec($scope.widget.valueDescription);
        if (_.isEmpty($scope.valueDescription)) {
          $scope.valueDescription = 'value';
        }
        $scope.valueFormat = _.jsExec($scope.widget.valueFormat);
        if (_.isEmpty($scope.valueFormat)) {
          $scope.valueFormat = '0,0.[0]';
        }
        $scope.colorDescription = _.jsExec($scope.widget.colorDescription);
        if (_.isEmpty($scope.colorDescription)) {
          $scope.colorDescription = 'color value';
        }
        $scope.colorProperty = _.jsExec($scope.widget.colorProperty);
        $scope.colorStops = _.compile($scope.widget.colorStops);
        $scope.showLegend = _.jsExec($scope.widget.showLegend);
        $scope.colorFormat = _.jsExec($scope.widget.colorFormat);
        if (_.isEmpty($scope.colorFormat)) {
          $scope.colorFormat = '0,0.[0]';
        }
        $scope.treeData = _.cloneDeep(data[0]);
      }
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':error', function(event, data) {
      $scope.widgetContext.dataSourceError = true;
      $scope.widgetContext.dataSourceErrorMessage = data.error;
      $scope.widgetContext.nodata = null;
      return $scope.widgetContext.loading = false;
    });
    $scope.$on('dataSource:' + dsDefinition.name + ':loading', function() {
      return $scope.widgetContext.loading = true;
    });
    return $scope.dataSource.init(dsDefinition);
  }
}]);


/*
 * Copyright (c) 2013-2015 the original author or authors.
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 *
 *     http://www.opensource.org/licenses/mit-license.php
 *
 * Unless required by applicable law or agreed to in writing, 
 * software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
 * either express or implied. See the License for the specific 
 * language governing permissions and limitations under the License.
 */
cyclotronApp.controller('YoutubeWidget', ['$scope', 'logService', function($scope, logService) {
  $scope.widgetContext.allowExport = false;
  return $scope.getUrl = function() {
    var ids, properties, url, widget;
    widget = _.compile($scope.widget);
    if (widget.videoId == null) {
      return '';
    }
    url = 'http://www.youtube.com/embed';
    properties = [];
    ids = widget.videoId.split(',');
    if (ids.length > 1) {
      url = url + '/' + _.first(ids);
      properties.push('playlist=' + _.rest(ids).join(','));
    } else if (widget.videoId.indexOf('PL') === 0) {
      properties.push('listType=playlist');
      properties.push('list=' + widget.videoId);
    } else if (widget.loop !== false) {
      url = 'http://www.youtube.com/v/' + widget.videoId;
      properties.push('playlist=,');
    } else {
      url = url + '/' + widget.videoId;
    }
    if (widget.autoplay !== false) {
      properties.push('autoplay=1');
    }
    if (widget.loop !== false) {
      properties.push('loop=1');
    }
    if (!widget.enableKeyboard) {
      properties.push('disablekb=1');
    }
    if (!widget.enableControls) {
      properties.push('controls=0');
    }
    if (widget.showRelated) {
      properties.push('rel=1');
    } else {
      properties.push('rel=0');
    }
    if (widget.showAnnotations) {
      properties.push('iv_load_policy=1');
    } else {
      properties.push('iv_load_policy=3');
    }
    if (properties.length > 0) {
      url = url + '?' + properties.join('&');
    }
    logService.debug('YouTube URL:', url);
    return $scope.$sce.trustAsResourceUrl(url);
  };
}]);
