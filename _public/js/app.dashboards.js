
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
cyclotronApp.controller('DashboardController', ['$scope', '$stateParams', '$localForage', '$location', '$timeout', '$window', '$q', '$uibModal', 'analyticsService', 'configService', 'cyclotronDataService', 'dashboardOverridesService', 'dashboardService', 'dataService', 'downloadService', 'loadService', 'logService', 'parameterService', 'userService', function($scope, $stateParams, $localForage, $location, $timeout, $window, $q, $uibModal, analyticsService, configService, cyclotronDataService, dashboardOverridesService, dashboardService, dataService, downloadService, loadService, logService, parameterService, userService) {
  var handleParameterChanges, handleQueryStringChanges, i, indexHistory, preloadTimer, rotateTimer, toggleLikeHelper;
  preloadTimer = null;
  rotateTimer = null;
  indexHistory = [];
  $scope.currentPage = [];
  $scope.currentPageIndex = -1;
  $scope.paused = true;
  $scope.firstLoad = true;
  $scope.firstUrlUpdate = true;
  $scope.firstParameterSync = true;
  $scope.restServiceUrl = configService.restServiceUrl;
  i = $stateParams.dashboard.indexOf('/');
  if (i > 0) {
    $scope.originalDashboardName = $stateParams.dashboard.substring(0, i);
    $scope.originalDashboardPageName = _.slugify($stateParams.dashboard.substring(i + 1));
  } else {
    $scope.originalDashboardName = $stateParams.dashboard;
    $scope.originalDashboardPageName = null;
  }
  $window.Cyclotron = {
    version: configService.version,
    currentUser: userService.currentUser(),
    dataSources: {},
    functions: {
      forceUpdate: function() {
        return $scope.$apply();
      },
      exportData: function(format, data, name) {
        if (name == null) {
          name = $scope.originalDashboardName;
        }
        if (data == null) {
          return;
        }
        return downloadService.download(name, format, data);
      },
      recordEvent: function(eventData) {
        return analyticsService.recordEvent('custom', eventData);
      }
    },
    parameters: _.clone($location.search()),
    data: cyclotronDataService
  };
  $scope.updateUrl = function() {
    var currentPage, pageName;
    currentPage = $scope.dashboard.pages[$scope.currentPageIndex];
    pageName = dashboardService.getPageName(currentPage, $scope.currentPageIndex);
    $scope.dashboardDisplayName = _.jsExec($scope.dashboard.displayName) || $scope.dashboard.name;
    loadService.setTitle($scope.dashboardDisplayName + ' | ' + pageName + ' | Cyclotron');
    if ((currentPage.name != null) || $scope.currentPageIndex !== 0) {
      $location.path('/' + $scope.dashboard.name + '/' + _.slugify(pageName));
    } else {
      $location.path('/' + $scope.dashboard.name);
    }
    Cyclotron.dashboardName = $scope.dashboard.name;
    Cyclotron.pageName = pageName;
    if ($scope.firstUrlUpdate) {
      $location.replace();
      return $scope.firstUrlUpdate = false;
    }
  };
  $scope.preload = function(specificIndex) {
    if ($scope.currentPage.length > 1) {
      return;
    }
    logService.debug('Preloading next page');
    if ((specificIndex != null) && _.isNumber(specificIndex)) {
      $scope.currentPageIndex = specificIndex;
    } else {
      $scope.currentPageIndex = dashboardService.rotate($scope.dashboard, $scope.currentPageIndex);
    }
    $scope.currentPage.push($scope.dashboard.pages[$scope.currentPageIndex]);
    indexHistory.push($scope.currentPageIndex);
    if (indexHistory.length > 100) {
      return indexHistory = _.last(indexHistory, 100);
    }
  };
  $scope.rotate = function() {
    var latestPage, pageNumber;
    pageNumber = $scope.currentPageIndex + 1;
    logService.debug('Rotating to page', pageNumber);
    $window.Cyclotron.parameters.page = pageNumber;
    if ($scope.currentPage.length > 1) {
      $scope.currentPage.splice(0, 1);
    }
    $scope.updateUrl();
    $window.Cyclotron.currentPage = {
      widgets: {}
    };
    analyticsService.recordPageView($scope.dashboardWrapper, $scope.currentPageIndex, $scope.firstLoad);
    if ($scope.paused) {
      return;
    }
    latestPage = _.last($scope.currentPage);
    if (preloadTimer != null) {
      clearTimeout(preloadTimer);
    }
    preloadTimer = setTimeout(_.ngApply($scope, $scope.preload), (latestPage.duration - $scope.dashboard.preload) * 1000);
    if (rotateTimer != null) {
      clearTimeout(rotateTimer);
    }
    return rotateTimer = setTimeout(_.ngApply($scope, $scope.rotate), latestPage.duration * 1000);
  };
  $scope.canMoveBack = function() {
    if (!(($scope.dashboard != null) && ($scope.dashboard.pages != null))) {
      return false;
    }
    return $scope.dashboard.pages.length > 1;
  };
  $scope.canMoveForward = function() {
    if (!(($scope.dashboard != null) && ($scope.dashboard.pages != null))) {
      return false;
    }
    return $scope.dashboard.pages.length > 1;
  };
  $scope.moveForward = function() {
    if (!$scope.canMoveForward()) {
      return;
    }
    logService.debug('User moving forward');
    if (!($scope.currentPage.length > 1)) {
      $scope.preload();
    }
    return $scope.rotate();
  };
  $scope.moveBack = function() {
    if (!$scope.canMoveBack()) {
      return;
    }
    logService.debug('User moving backward');
    if (indexHistory.length > 1) {
      indexHistory.pop();
      $scope.currentPageIndex = _.last(indexHistory);
    } else {
      $scope.currentPageIndex = $scope.currentPageIndex - 1;
      if ($scope.currentPageIndex < 0) {
        $scope.currentPageIndex = $scope.dashboard.pages.length - 1;
      }
    }
    $scope.currentPage = [$scope.dashboard.pages[$scope.currentPageIndex]];
    return $scope.rotate();
  };
  $scope.goToPage = function(pageNumber) {
    if (pageNumber > $scope.dashboard.pages.length) {
      pageNumber = 1;
    }
    $window.Cyclotron.parameters.page = pageNumber;
    $scope.preload(pageNumber - 1);
    return $scope.rotate();
  };
  $scope.pause = function() {
    $scope.paused = true;
    if (preloadTimer != null) {
      clearTimeout(preloadTimer);
    }
    if (rotateTimer != null) {
      return clearTimeout(rotateTimer);
    }
  };
  $scope.play = function() {
    if (!$scope.canMoveForward()) {
      return;
    }
    $scope.paused = false;
    return $scope.rotate();
  };
  $scope.togglePause = function() {
    if ($scope.paused === true) {
      return $scope.play();
    } else {
      return $scope.pause();
    }
  };
  toggleLikeHelper = function() {
    if ($scope.isLiked) {
      return dashboardService.unlike($scope.dashboardWrapper).then(function() {
        return $scope.isLiked = false;
      });
    } else {
      return dashboardService.like($scope.dashboardWrapper).then(function() {
        return $scope.isLiked = true;
      });
    }
  };
  $scope.toggleLike = function() {
    if (userService.authEnabled && !userService.isLoggedIn()) {
      return $scope.login(true).then(toggleLikeHelper);
    } else {
      return toggleLikeHelper();
    }
  };
  handleQueryStringChanges = function(parameters, oldParameters) {
    var deletedKeys;
    if (_.isEqual(parameters, oldParameters)) {
      return;
    }
    logService.debug('Updating Cyclotron.parameters from querystring');
    _.assign($window.Cyclotron.parameters, parameters);
    deletedKeys = _.difference(_.keys(oldParameters), _.keys(parameters));
    _.each(deletedKeys, function(key) {
      logService.debug('Removing parameter from Cyclotron.parameters: ' + key);
      delete Cyclotron.parameters[key];
    });
    if (parameters.page !== oldParameters.page) {
      return $scope.goToPage(parameters.page);
    }
  };
  handleParameterChanges = function(parameters, oldParameters) {
    var deeplinkOptions, deletedKeys, exportOptions;
    if (_.isEqual(parameters, oldParameters)) {
      return;
    }
    logService.debug('Updating querystring from Cyclotron.parameters');
    deletedKeys = _.difference(_.keys(oldParameters), _.keys(parameters));
    _.each(deletedKeys, function(key) {
      logService.debug('Removing parameter from URL: ' + key);
      $location.search(key, null);
    });
    parameterService.savePersistentParameters(parameters, $scope.dashboard);
    exportOptions = {};
    deeplinkOptions = {};
    _.each(parameters, function(value, key) {
      var changeHandler, defaultValue, parameterDefinition, showInUrl, stringify;
      parameterDefinition = _.find($scope.dashboard.parameters, {
        name: key
      });
      defaultValue = parameterDefinition != null ? parameterDefinition.defaultValue : void 0;
      showInUrl = true;
      if ((parameterDefinition != null ? parameterDefinition.showInUrl : void 0) === false) {
        showInUrl = false;
      }
      stringify = function(v) {
        if (moment.isMoment(value)) {
          return v.toISOString();
        } else {
          return v;
        }
      };
      if (key === 'page') {
        $location.search(key, null);
      } else if ((defaultValue != null) && stringify(_.jsExec(defaultValue)) === stringify(value)) {
        $location.search(key, null);
        deeplinkOptions[key] = stringify(value);
      } else if (!showInUrl) {
        $location.search(key, null);
        deeplinkOptions[key] = stringify(value);
        exportOptions[key] = stringify(value);
      } else if (key === 'live') {
        $location.search(key, stringify(value));
        deeplinkOptions[key] = stringify(value);
      } else {
        $location.search(key, stringify(value));
        deeplinkOptions[key] = stringify(value);
        exportOptions[key] = stringify(value);
      }
      if ((parameterDefinition != null) && !_.isEqual(value, oldParameters[key])) {
        changeHandler = _.jsEval(parameterDefinition.changeEvent);
        if (_.isFunction(changeHandler)) {
          changeHandler(key, value, oldParameters[key]);
        }
      }
    });
    if ($scope.firstParameterSync) {
      $location.replace();
      $scope.firstParameterSync = false;
    }
    $scope.exportUrl = new URI('/export').segment($scope.dashboard.name).search(exportOptions).toString();
    return $scope.deeplinkOptions = deeplinkOptions;
  };
  $scope.loadDashboard = function(deferred) {
    var q;
    if (deferred == null) {
      deferred = $q.defer();
    }
    q = dashboardService.getDashboard($scope.originalDashboardName, $window.Cyclotron.parameters.rev);
    q.then(function(dashboardWrapper) {
      var dashboard, dependenciesLoaded, hasAsynchLoaded, load;
      if (dashboardWrapper.deleted) {
        $uibModal.open({
          templateUrl: '/partials/410.html',
          scope: $scope,
          controller: 'GenericErrorModalController',
          backdrop: 'static',
          keyboard: false
        });
        return;
      }
      $scope.dashboardWrapper = Cyclotron.dashboard = dashboardWrapper;
      $scope.isLiked = userService.likesDashboard(dashboardWrapper);
      dashboard = dashboardWrapper.dashboard;
      dashboardService.setDashboardDefaults(dashboard);
      $scope.dashboard = dashboard;
      if (dashboard.disableAnalytics === true) {
        if (configService.analytics == null) {
          configService.analytics = {};
        }
        configService.analytics.enable = false;
      }
      dependenciesLoaded = function() {
        var newPage, originalPage;
        if ($scope.latestRevision && $scope.latestRevision < $scope.dashboardWrapper.rev) {
          originalPage = $scope.currentPage[$scope.currentPage.length - 1];
          newPage = $scope.dashboard.pages[$scope.currentPageIndex];
          if (!angular.equals(originalPage, newPage)) {
            logService.debug('Replacing the current page with a new revision');
            $scope.currentPage[$scope.currentPage.length - 1] = newPage;
          }
        }
        $scope.latestRevision = $scope.dashboardWrapper.rev;
        deferred.resolve();
        $timeout(function() {
          return $scope.loadDashboard().then($scope.subsequentLoad);
        }, $scope.reloadInterval);
      };
      loadService.removeLoadedCss();
      _.each(dashboard.styles, function(s) {
        if (_.isEmpty(s.path)) {
          return loadService.loadCssInline(s.text);
        } else {
          return loadService.loadCssUrl(s.path);
        }
      });
      hasAsynchLoaded = false;
      load = function(list) {
        var currentScript, nextInvocation, tail;
        if (_.isEmpty(list)) {
          if (hasAsynchLoaded) {
            return $scope.$apply(dependenciesLoaded);
          } else {
            return dependenciesLoaded();
          }
        } else {
          currentScript = _.head(list);
          tail = _.tail(list);
          nextInvocation = _.wrap(tail, load);
          if (currentScript.singleLoad === true && $scope.firstLoad === false) {
            return nextInvocation();
          } else if (_.isEmpty(currentScript.path)) {
            eval.call($window, currentScript.text);
            return nextInvocation();
          } else {
            hasAsynchLoaded = true;
            return $script(currentScript.path, nextInvocation);
          }
        }
      };
      return load(dashboard.scripts);
    });
    q["catch"](function(error) {
      switch (error.status) {
        case 401:
          $scope.login(true).then(function() {
            return $scope.loadDashboard(deferred);
          });
          return;
        case 403:
          $scope.dashboardEditors = error.data.data.editors;
          $scope.dashboardName = $scope.originalDashboardName;
          $uibModal.open({
            templateUrl: '/partials/viewPermissionDenied.html',
            scope: $scope,
            controller: 'GenericErrorModalController',
            backdrop: 'static',
            keyboard: false
          });
          break;
        case 404:
          $uibModal.open({
            templateUrl: '/partials/404.html',
            scope: $scope,
            controller: 'GenericErrorModalController',
            backdrop: 'static',
            keyboard: false
          });
          break;
        default:
          if ($scope.firstLoad) {
            $uibModal.open({
              templateUrl: '/partials/500.html',
              scope: $scope,
              controller: 'GenericErrorModalController',
              backdrop: 'static',
              keyboard: false
            });
          } else {
            $timeout($scope.loadDashboard, $scope.reloadInterval);
          }
      }
      return deferred.reject();
    });
    return deferred.promise;
  };
  $scope.initialLoad = function() {
    var themes;
    themes = dashboardService.getThemes($scope.dashboard);
    _.each(themes, function(theme) {
      return loadService.loadCssUrl('/css/app.themes.' + theme + '.css', true);
    });
    return dashboardOverridesService.initializeDashboardOverrides($scope.dashboard).then(function(dashboardOverrides) {
      $window.Cyclotron.dashboardOverrides = $scope.dashboardOverrides = dashboardOverrides;
      $scope.$watch('dashboardOverrides', function(updatedOverrides, previousOverrides) {
        if (_.isEqual(updatedOverrides, previousOverrides)) {
          return;
        }
        return dashboardOverridesService.saveDashboardOverrides($scope.dashboard, updatedOverrides);
      }, true);
      $scope.resetDashboardOverrides = function() {
        return $window.Cyclotron.dashboardOverrides = $scope.dashboardOverrides = dashboardOverridesService.resetAndExpandOverrides($scope.dashboard);
      };
      return parameterService.initializeParameters($scope.dashboard).then(function() {
        var pageIndex, pageNames, preloadDataSources;
        $scope.$watch((function() {
          return $location.search();
        }), handleQueryStringChanges);
        $scope.$watch((function() {
          return $window.Cyclotron.parameters;
        }), handleParameterChanges, true);
        preloadDataSources = _.filter($scope.dashboard.dataSources, {
          preload: true
        });
        _.each(preloadDataSources, function(dataSourceDefinition) {
          var dataSource;
          logService.info('Preloading data source', dataSourceDefinition.name);
          dataSource = dataService.get(dataSourceDefinition);
          dataSource.getData(dataSourceDefinition, _.noop, _.noop, _.noop);
        });
        if ($scope.dashboard.pages.length > 0) {
          if ($window.Cyclotron.parameters.page != null) {
            $scope.goToPage(parseInt($window.Cyclotron.parameters.page));
          } else if (!_.isEmpty($scope.originalDashboardPageName)) {
            pageNames = _.pluck($scope.dashboard.pages, 'name');
            pageIndex = _.findIndex(pageNames, function(name) {
              return (name != null) && _.slugify(name) === $scope.originalDashboardPageName;
            });
            if (pageIndex >= 0) {
              $scope.goToPage(1 + pageIndex);
            } else if ($scope.originalDashboardPageName.match(/page-\d+$/)) {
              $scope.goToPage(parseInt($scope.originalDashboardPageName.substring(5)));
            } else {
              $scope.goToPage(1);
            }
          } else {
            $scope.goToPage(1);
          }
        }
        if ($window.Cyclotron.parameters.autoRotate === "true" || $scope.dashboard.autoRotate === true) {
          if ($scope.dashboard.pages.length > 1) {
            $scope.paused = false;
            $scope.rotate();
          }
        }
        return $scope.firstLoad = false;
      });
    });
  };
  $scope.subsequentLoad = function() {
    return dashboardOverridesService.expandOverrides($scope.dashboard, $scope.dashboardOverrides);
  };
  $scope.reloadInterval = $window.Cyclotron.parameters.live === 'true' ? 1500 : 60000;
  $window.Cyclotron.goToPage = $scope.goToPage;
  $window.Cyclotron.getDeeplink = function() {
    return new URI().search($scope.deeplinkOptions).toString();
  };
  $scope.loadDashboard().then($scope.initialLoad);
  $('body').bind('keydown', 'left', _.ngNonPropagatingHandler($scope, $scope.moveBack));
  $('body').bind('keydown', 'pageup', _.ngNonPropagatingHandler($scope, $scope.moveBack));
  $('body').bind('keydown', 'right', _.ngNonPropagatingHandler($scope, $scope.moveForward));
  $('body').bind('keydown', 'pagedown', _.ngNonPropagatingHandler($scope, $scope.moveForward));
  return $('body').bind('keydown', 'space', _.ngNonPropagatingHandler($scope, $scope.togglePause));
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
cyclotronDataSources.factory('cloudwatchDataSource', ['$q', '$http', 'configService', 'dataSourceFactory', 'logService', function($q, $http, configService, dataSourceFactory, logService) {
  var getProxyRequest, processResponse, runner;
  getProxyRequest = function(options) {
    var compiledParameters, proxyBody, url;
    options = _.compile(options, {});
    url = new URI(options.url);
    if (options.parameters != null) {
      compiledParameters = _.compile(options.parameters, {});
      _.each(compiledParameters, function(value, key) {
        var index;
        switch (key) {
          case 'Dimensions':
            index = 0;
            return _.each(value, function(dimValue, dimName) {
              index += 1;
              url.addSearch('Dimensions.member.' + index + '.Name', dimName);
              return url.addSearch('Dimensions.member.' + index + '.Value', dimValue);
            });
          case 'Statistics':
            if (_.isArray(value)) {
              return _.each(value, function(statistic, index) {
                return url.addSearch('Statistics.member.' + (index + 1), statistic);
              });
            }
            break;
          default:
            return url.addSearch(key, value);
        }
      });
    }
    proxyBody = {
      url: url.toString(),
      method: 'GET',
      json: true,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (options.awsCredentials != null) {
      proxyBody.host = url.hostname();
      proxyBody.path = url.path() + url.search();
      proxyBody.awsCredentials = options.awsCredentials;
    }
    return proxyBody;
  };
  processResponse = function(response, action, reject) {
    switch (action) {
      case 'ListMetrics':
        return response.ListMetricsResponse.ListMetricsResult.Metrics;
      case 'GetMetricStatistics':
        return _.sortBy(response.GetMetricStatisticsResponse.GetMetricStatisticsResult.Datapoints, 'Timestamp');
      default:
        return reject('Unknown Action value "' + action + '"');
    }
  };
  runner = function(options) {
    return $q(function(resolve, reject) {
      var errorCallback, proxyUri, req, successCallback;
      errorCallback = function(error, status) {
        if (error === '' && status === 0) {
          error = 'Cross-Origin Resource Sharing error with the server.';
        }
        return reject(error);
      };
      successCallback = function(result) {
        var data, error, ref, ref1, ref2, ref3, ref4;
        if (result.statusCode === 200) {
          data = processResponse(result.body, _.jsExec((ref = options.parameters) != null ? ref.Action : void 0), reject);
          if (_.isNull(data)) {
            logService.debug('CloudWatch result is null.');
            data = [];
          }
          return resolve({
            '0': {
              data: data,
              columns: null
            }
          });
        } else {
          error = ((ref1 = result.body) != null ? (ref2 = ref1.Error) != null ? ref2.Code : void 0 : void 0) + ': ' + ((ref3 = result.body) != null ? (ref4 = ref3.Error) != null ? ref4.Message : void 0 : void 0);
          if (error == null) {
            error = 'Status code: ' + result.statusCode;
          }
          logService.error(error);
          return reject(error);
        }
      };
      proxyUri = new URI(_.jsExec(options.proxy) || configService.restServiceUrl).protocol('').segment('proxy').toString();
      req = $http.post(proxyUri, getProxyRequest(options));
      req.success(successCallback);
      return req.error(errorCallback);
    });
  };
  return dataSourceFactory.create('CloudWatch', runner);
}]);


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
cyclotronDataSources.factory('cyclotrondataDataSource', ['$q', '$http', 'configService', 'dataSourceFactory', function($q, $http, configService, dataSourceFactory) {
  var runner;
  runner = function(options) {
    var errorCallback, key, q, req, successCallback, url;
    q = $q.defer();
    errorCallback = function(error, status) {
      if (error === '' && status === 0) {
        error = 'Cross-Origin Resource Sharing error with the server.';
      }
      return q.reject(error);
    };
    successCallback = function(result) {
      return q.resolve({
        '0': {
          data: result.data,
          columns: null
        }
      });
    };
    key = _.jsExec(options.key);
    url = (_.jsExec(options.url) || configService.restServiceUrl) + '/data/' + encodeURIComponent(key) + '/data';
    req = $http.get(url);
    req.then(successCallback);
    req.error(errorCallback);
    return q.promise;
  };
  return dataSourceFactory.create('CyclotronData', runner);
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
cyclotronDataSources.factory('elasticsearchDataSource', ['$q', '$http', 'configService', 'dataSourceFactory', 'logService', function($q, $http, configService, dataSourceFactory, logService) {
  var getProxyRequest, processAggregations, processResponse, runner;
  getProxyRequest = function(options) {
    var compiledOptions, proxyBody, url;
    options = _.compile(options, {});
    url = new URI(options.url).segment(options.index).segment(options.method);
    proxyBody = {
      url: url.toString(),
      method: 'POST',
      json: true,
      body: options.request,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (options.options != null) {
      compiledOptions = _.compile(options.options, {});
      _.assign(proxyBody, compiledOptions);
    }
    if (options.awsCredentials != null) {
      proxyBody.host = url.hostname();
      proxyBody.path = url.path();
      proxyBody.awsCredentials = options.awsCredentials;
    }
    return proxyBody;
  };
  processAggregations = function(aggs, newBucketTemplate) {
    var buckets, key;
    if (newBucketTemplate == null) {
      newBucketTemplate = {};
    }
    key = _.first(_.keys(aggs));
    buckets = _.map(aggs[key].buckets, function(bucket) {
      var newBucket, subAggs, subBucketKey, subBuckets;
      newBucket = _.clone(newBucketTemplate);
      newBucket[key] = bucket.key;
      delete bucket.key;
      subBucketKey = null;
      _.forOwn(bucket, function(value, key) {
        if (_.isObject(value) && !_.isArray(value)) {
          if (value.buckets != null) {
            subBucketKey = key;
          } else if (value.value != null) {
            newBucket[key] = value.value;
          }
        } else {
          newBucket[key] = value;
        }
        return true;
      });
      if (subBucketKey != null) {
        subAggs = {};
        subAggs[subBucketKey] = bucket[subBucketKey];
        subBuckets = processAggregations(subAggs, newBucket);
        return _.flatten(subBuckets);
      }
      return newBucket;
    });
    return _.flatten(buckets);
  };
  processResponse = function(response, responseAdapter, reject) {
    var ref;
    if (responseAdapter === 'auto') {
      if (response.aggregations != null) {
        responseAdapter = 'aggregations';
      } else {
        responseAdapter = 'hits';
      }
    }
    switch (responseAdapter) {
      case 'raw':
        return response;
      case 'hits':
        return _.map((ref = response.hits) != null ? ref.hits : void 0, _.flattenObject);
      case 'aggregations':
        return processAggregations(response.aggregations);
      default:
        return reject('Unknown responseAdapter value "' + responseAdapter + '"');
    }
  };
  runner = function(options) {
    return $q(function(resolve, reject) {
      var errorCallback, proxyUri, req, successCallback;
      errorCallback = function(error, status) {
        if (error === '' && status === 0) {
          error = 'Cross-Origin Resource Sharing error with the server.';
        }
        return reject(error);
      };
      successCallback = function(result) {
        var data, error, ref, responseAdapter;
        if (result.statusCode === 200) {
          responseAdapter = _.jsExec(options.responseAdapter);
          if (result.body.responses != null) {
            data = _.map(result.body.responses, function(response) {
              return processResponse(response, responseAdapter, reject);
            });
            data = _.flatten(data);
          } else {
            data = processResponse(result.body, responseAdapter, reject);
          }
          if (_.isNull(data)) {
            logService.debug('Elasticsearch result is null.');
            data = [];
          }
          return resolve({
            '0': {
              data: data,
              columns: null
            }
          });
        } else {
          error = (ref = result.body) != null ? ref.error : void 0;
          if (error == null) {
            error = 'Status code: ' + result.statusCode;
          }
          logService.error(error);
          return reject(error);
        }
      };
      proxyUri = new URI(_.jsExec(options.proxy) || configService.restServiceUrl).protocol('').segment('proxy').toString();
      req = $http.post(proxyUri, getProxyRequest(options));
      req.success(successCallback);
      return req.error(errorCallback);
    });
  };
  return dataSourceFactory.create('Elasticsearch', runner);
}]);


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
cyclotronDataSources.factory('dataSourceFactory', ['$rootScope', '$interval', 'configService', 'dataService', 'analyticsService', 'logService', function($rootScope, $interval, configService, dataService, analyticsService, logService) {
  return {
    create: function(dataSourceType, runner, analyticsDetails) {
      return {
        initialize: function(options) {
          var broadcastData, broadcastError, broadcastLoading, cachedResult, clients, dataVersion, errorHandler, firstLoad, postProcessor, preProcessor, q, startRunner, state;
          logService.debug('Initializing Data Source:', options.name);
          cachedResult = null;
          q = null;
          clients = [];
          firstLoad = true;
          dataVersion = 0;
          state = {};
          preProcessor = _.jsEval(options.preProcessor);
          if (!_.isFunction(preProcessor)) {
            preProcessor = null;
          }
          postProcessor = _.jsEval(options.postProcessor);
          if (!_.isFunction(postProcessor)) {
            postProcessor = null;
          }
          errorHandler = _.jsEval(options.errorHandler);
          if (!_.isFunction(errorHandler)) {
            errorHandler = null;
          }
          broadcastLoading = function() {
            $rootScope.$broadcast('dataSource:' + options.name + ':loading');
            return _.each(clients, function(client) {
              if ((client.loadingCallback != null) && _.isFunction(client.loadingCallback)) {
                client.loadingCallback();
              }
            });
          };
          broadcastError = function(error) {
            $rootScope.$broadcast('dataSource:' + options.name + ':error', {
              error: error
            });
            return _.each(clients, function(client) {
              if (_.isFunction(client.errorCallback)) {
                return client.errorCallback(error);
              }
            });
          };
          broadcastData = function() {
            logService.debug('Broadcasting Data Source:', options.name);
            $rootScope.$broadcast('dataSource:' + options.name + ':data', {
              data: cachedResult,
              isUpdate: !firstLoad,
              version: dataVersion
            });
            return _.each(clients, function(client) {
              var ref, ref1, resultSet;
              resultSet = client.dataSourceDefinition.resultSet;
              client.callback(cachedResult != null ? (ref = cachedResult[resultSet]) != null ? ref.data : void 0 : void 0, cachedResult != null ? (ref1 = cachedResult[resultSet]) != null ? ref1.columns : void 0 : void 0, !firstLoad);
            });
          };
          startRunner = function() {
            var currentOptions, preProcessedResult, runnerError, runnerSuccess, sendAnalytics, startTime;
            logService.info(dataSourceType, 'Data Source "' + options.name + '" Started');
            startTime = performance.now();
            currentOptions = _.compile(options, options);
            if (preProcessor != null) {
              preProcessedResult = preProcessor(currentOptions);
              if (_.isObject(preProcessedResult)) {
                currentOptions = preProcessedResult;
              }
            }
            sendAnalytics = function(success, details) {
              var endTime;
              if (details == null) {
                details = {};
              }
              endTime = performance.now();
              if (_.isFunction(analyticsDetails)) {
                details = _.merge(details, analyticsDetails(currentOptions));
              }
              if (_.isObject(details.errorMessage)) {
                details.errorMessage = JSON.stringify(details.errorMessage);
              }
              return analyticsService.recordDataSource(currentOptions, success, endTime - startTime, details);
            };
            runnerError = function(error) {
              var e, newError;
              logService.error(dataSourceType, 'Data Source "' + options.name + '" Failed');
              sendAnalytics(false, {
                errorMessage: error
              });
              if (errorHandler != null) {
                try {
                  newError = errorHandler(error);
                  if (_.isString(newError)) {
                    error = newError;
                  }
                } catch (error1) {
                  e = error1;
                  error = e;
                }
              }
              cachedResult = null;
              q = null;
              return broadcastError(error);
            };
            runnerSuccess = function(result) {
              logService.info(dataSourceType, 'Data Source "' + currentOptions.name + '" Completed');
              sendAnalytics(true);
              cachedResult = result;
              _.forIn(result, function(resultSet, resultSetName) {
                var postProcessedResult;
                if (resultSet.columns == null) {
                  resultSet.columns = null;
                }
                if (currentOptions.filters != null) {
                  resultSet.data = dataService.filter(resultSet.data, currentOptions.filters);
                }
                if (currentOptions.sortBy != null) {
                  resultSet.data = dataService.sort(resultSet.data, currentOptions.sortBy);
                }
                cachedResult[resultSetName] = resultSet;
                if (postProcessor != null) {
                  postProcessedResult = postProcessor(resultSet.data, resultSetName);
                  if (_.isArray(postProcessedResult)) {
                    cachedResult[resultSetName].data = postProcessedResult;
                  } else {
                    logService.error('The Post-Processor for "' + currentOptions.name + '" did not return an array; ignoring and using original result.');
                  }
                }
              });
              dataVersion = dataVersion + 1;
              broadcastData();
              return firstLoad = false;
            };
            q = runner(currentOptions, state);
            q.then(runnerSuccess, runnerError);
            return q;
          };
          return {
            init: function(dataSourceDefinition) {
              if (dataSourceDefinition.resultSet == null) {
                dataSourceDefinition.resultSet = '0';
              }
              if (cachedResult != null) {
                return broadcastData();
              } else if (options.deferred === true && firstLoad === true) {

              } else if (q == null) {
                startRunner();
                if (options.refresh != null) {
                  return $interval(startRunner, options.refresh * 1000);
                }
              }
            },
            getCachedData: function(resultSet) {
              var ref;
              if (resultSet == null) {
                resultSet = '0';
              }
              return cachedResult != null ? (ref = cachedResult[resultSet]) != null ? ref.data : void 0 : void 0;
            },
            getPromise: function() {
              return q;
            },
            execute: function(toggleSpinners) {
              if ((toggleSpinners != null) && toggleSpinners === true) {
                broadcastLoading();
              }
              return startRunner();
            },
            getData: function(dataSourceDefinition, callback, errorCallback, loadingCallback) {
              var ref, ref1;
              if (!_.isFunction(callback)) {
                return;
              }
              if (dataSourceDefinition.resultSet == null) {
                dataSourceDefinition.resultSet = '0';
              }
              clients.push({
                callback: callback,
                errorCallback: errorCallback,
                loadingCallback: loadingCallback,
                dataSourceDefinition: dataSourceDefinition
              });
              if (cachedResult != null) {
                return callback((ref = cachedResult[dataSourceDefinition.resultSet]) != null ? ref.data : void 0, (ref1 = cachedResult[dataSourceDefinition.resultSet]) != null ? ref1.columns : void 0, false);
              } else if (options.deferred === true && firstLoad === true) {
                return callback(null);
              } else if (q == null) {
                startRunner();
                if (options.refresh != null) {
                  return $interval(startRunner, options.refresh * 1000);
                }
              }
            }
          };
        }
      };
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
cyclotronDataSources.factory('graphiteDataSource', ['$q', '$http', 'configService', 'dataSourceFactory', function($q, $http, configService, dataSourceFactory) {
  var getGraphiteUrl, getProxyRequest, runner;
  getGraphiteUrl = function(url) {
    var graphiteUrl;
    graphiteUrl = _.jsExec(url);
    if (graphiteUrl.indexOf('http') !== 0 && graphiteUrl.indexOf('!{') !== 0) {
      graphiteUrl = 'http://' + graphiteUrl;
    }
    if (graphiteUrl.lastIndexOf('/') < graphiteUrl.length - 1) {
      graphiteUrl += '/';
    }
    graphiteUrl += 'render?format=json&';
    return graphiteUrl;
  };
  getProxyRequest = function(options) {
    var body, queryParams;
    body = {
      method: 'GET',
      json: true,
      url: getGraphiteUrl(options.url)
    };
    if (options.from != null) {
      body.url += 'from=' + _.jsExec(options.from) + '&';
    }
    if (options.until != null) {
      body.url += 'until=' + _.jsExec(options.until) + '&';
    }
    if (options.targets != null) {
      queryParams = _.map(options.targets, function(target) {
        return 'target=' + encodeURIComponent(_.jsExec(target));
      });
      body.url += queryParams.join('&');
    }
    return body;
  };
  runner = function(options) {
    var errorCallback, proxyUri, q, req, successCallback;
    q = $q.defer();
    errorCallback = function(error, status) {
      if (error === '' && status === 0) {
        error = 'Cross-Origin Resource Sharing error with the server.';
      }
      return q.reject(error);
    };
    successCallback = function(result) {
      var data;
      if (!_.isObject(result.body)) {
        return errorCallback('Error retrieving data from Graphite', -1);
      }
      data = [];
      if (!_.isEmpty(result.body)) {
        data = _.map(_.head(result.body).datapoints, function(datapoint) {
          return {
            _time: datapoint[1] * 1000
          };
        });
        _.each(result.body, function(target) {
          return _.each(target.datapoints, function(datapoint, index) {
            return data[index][target.target] = datapoint[0];
          });
        });
      }
      return q.resolve({
        '0': {
          data: data,
          columns: null
        }
      });
    };
    proxyUri = new URI(_.jsExec(options.proxy) || configService.restServiceUrl).protocol('').segment('proxy').toString();
    req = $http.post(proxyUri, getProxyRequest(options));
    req.success(successCallback);
    req.error(errorCallback);
    return q.promise;
  };
  return dataSourceFactory.create('Graphite', runner);
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
cyclotronDataSources.factory('influxdbDataSource', ['$q', '$http', 'configService', 'dataSourceFactory', function($q, $http, configService, dataSourceFactory) {
  var getInfluxUrl, getProxyRequest, runner;
  getInfluxUrl = function(options) {
    var influxUrl, params;
    influxUrl = _.jsExec(options.url);
    if (influxUrl.indexOf('http') !== 0) {
      influxUrl = 'http://' + influxUrl;
    }
    influxUrl = new URI(influxUrl);
    if (influxUrl.port() === '') {
      influxUrl = influxUrl.port('8086');
    }
    if (influxUrl.pathname() === '' || influxUrl.pathname() === '/') {
      influxUrl = influxUrl.pathname('/query');
    }
    params = {
      db: _.jsExec(options.database),
      q: _.jsExec(options.query),
      epoch: _.jsExec(options.precision)
    };
    if (options.username != null) {
      params.u = _.jsExec(options.username);
    }
    if (options.password != null) {
      params.p = _.jsExec(options.password);
    }
    influxUrl.search(params);
    return influxUrl.toString();
  };
  getProxyRequest = function(options) {
    var body;
    body = {
      method: 'GET',
      json: true,
      url: getInfluxUrl(options)
    };
    return body;
  };
  runner = function(options) {
    var errorCallback, proxyUri, q, req, successCallback;
    q = $q.defer();
    errorCallback = function(error, status) {
      if (error === '' && status === 0) {
        error = 'Cross-Origin Resource Sharing error with the server.';
      }
      return q.reject(error);
    };
    successCallback = function(result) {
      var data, influxResult, ref;
      if (!_.isObject(result.body)) {
        return errorCallback('Error retrieving data from InfluxDB', -1);
      }
      if (result.statusCode !== 200) {
        return errorCallback(result.body.error, result.statusCode);
      }
      data = [];
      if (!_.isEmpty((ref = result.body) != null ? ref.results : void 0)) {
        if (result.body.results.length > 1) {
          return errorCallback('Multiple InfluxDB queries are not supported', 0);
        }
        influxResult = result.body.results[0];
        if (influxResult.error != null) {
          return errorCallback(influxResult.error, 0);
        }
        _.each(influxResult.series, function(series) {
          var seriesData;
          seriesData = _.map(series.values, function(values) {
            var row;
            row = _.zipObject(series.columns, values);
            return row = _.merge(row, series.tags);
          });
          return data = data.concat(seriesData);
        });
      }
      return q.resolve({
        '0': {
          data: data,
          columns: null
        }
      });
    };
    proxyUri = new URI(_.jsExec(options.proxy) || configService.restServiceUrl).protocol('').segment('proxy').toString();
    req = $http.post(proxyUri, getProxyRequest(options));
    req.success(successCallback);
    req.error(errorCallback);
    return q.promise;
  };
  return dataSourceFactory.create('InfluxDB', runner);
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
cyclotronDataSources.factory('javascriptDataSource', ['$q', '$http', 'configService', 'dataSourceFactory', function($q, $http, configService, dataSourceFactory) {
  var runner;
  runner = function(options) {
    var error, processor, promise, q, q2, result;
    q = $q.defer();
    processor = _.jsEval(options.processor);
    if (!_.isFunction(processor)) {
      processor = null;
    }
    if (processor != null) {
      promise = $q.defer();
      try {
        result = processor(promise) || promise.promise;
        if (_.isObject(result) && (result.promise != null)) {
          result = result.promise;
        }
        q2 = $q.when(result);
        q2.then(function(data) {
          var err;
          if (_.isArray(data)) {
            return q.resolve({
              '0': {
                data: data,
                columns: null
              }
            });
          } else {
            err = 'Invalid data set returned in JavaScript Data Source.  Returned object must be an array of objects.';
            console.log(err);
            return q.reject(err);
          }
        });
        q2["catch"](function(reason) {
          console.log(reason);
          return q.reject(reason);
        });
      } catch (error1) {
        error = error1;
        q.reject(error);
      }
    } else {
      q.reject('Processor is not a function.');
    }
    return q.promise;
  };
  return dataSourceFactory.create('JavaScript', runner);
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
cyclotronDataSources.factory('jsonDataSource', ['$q', '$http', 'configService', 'dataSourceFactory', function($q, $http, configService, dataSourceFactory) {
  var getProxyRequest, runner;
  getProxyRequest = function(options) {
    var compiledOptions, proxyBody, queryParams, url;
    url = new URI(_.jsExec(options.url));
    if (options.queryParameters != null) {
      queryParams = url.search(true);
      _.forIn(options.queryParameters, function(value, key) {
        return queryParams[_.jsExec(key)] = _.jsExec(value);
      });
      url.search(queryParams);
    }
    proxyBody = {
      url: url.toString(),
      method: options.method || 'GET',
      json: true
    };
    if (options.options != null) {
      compiledOptions = _.compile(options.options, {});
      _.assign(proxyBody, compiledOptions);
    }
    if (options.awsCredentials != null) {
      proxyBody.host = url.hostname();
      proxyBody.path = url.path() + url.search();
      proxyBody.awsCredentials = options.awsCredentials;
    }
    return proxyBody;
  };
  runner = function(options) {
    var errorCallback, proxyUri, q, req, successCallback;
    q = $q.defer();
    errorCallback = function(error, status) {
      if (error === '' && status === 0) {
        error = 'Cross-Origin Resource Sharing error with the server.';
      }
      return q.reject(error);
    };
    successCallback = function(result) {
      return q.resolve({
        '0': {
          data: result.body,
          columns: null
        }
      });
    };
    proxyUri = new URI(_.jsExec(options.proxy) || configService.restServiceUrl).protocol('').segment('proxy').toString();
    req = $http.post(proxyUri, getProxyRequest(options));
    req.success(successCallback);
    req.error(errorCallback);
    return q.promise;
  };
  return dataSourceFactory.create('JSON', runner);
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
cyclotronDataSources.factory('mockDataSource', ['$q', 'dataSourceFactory', 'logService', function($q, dataSourceFactory, logService) {
  var getDucatiFunction, runner;
  getDucatiFunction = function() {
    var gb, grossBookings, rn, roomNights, startTime;
    gb = 2500;
    rn = 70;
    grossBookings = function() {
      return Math.floor(gb + (Math.random() * 5000 - 2500));
    };
    roomNights = function() {
      return Math.floor(rn + (Math.random() * 170 - 70));
    };
    startTime = moment().startOf('minute');
    return function(num) {
      return {
        id: num,
        _time: moment(startTime).add(num, 'minutes').unix(),
        grossbookingvalue: grossBookings(),
        roomnightcount: roomNights()
      };
    };
  };
  runner = function(options, state) {
    var num, q;
    q = $q.defer();
    if ((options.format == null) || options.format === 'object') {
      state.cache = [
        {
          color: "red",
          number: 1,
          state: "WA",
          status: "green"
        }, {
          state: "CA",
          color: "green",
          number: 41,
          status: "green"
        }, {
          state: "CA",
          color: "red",
          number: 2,
          status: "green"
        }, {
          color: "red",
          number: 15,
          state: "WA",
          country: "USA",
          status: "green"
        }, {
          color: "blue",
          number: 23,
          state: "CO",
          status: "yellow"
        }, {
          color: "black",
          number: 45,
          state: "WA",
          status: "red"
        }, {
          color: "green",
          number: 32,
          state: "WA",
          status: "yellow"
        }, {
          color: "green",
          number: 99,
          state: "WA",
          status: "yellow"
        }, {
          color: "black",
          number: 1,
          state: "WA",
          status: "red"
        }, {
          color: "black",
          number: 45,
          state: "CA",
          status: "red"
        }, {
          color: "white",
          number: 24,
          state: "AK",
          status: "red"
        }, {
          color: "white",
          number: 16,
          state: "AK",
          status: "yellow"
        }
      ];
    } else if (options.format === 'pie') {
      state.cache = [
        {
          browser: "Firefox",
          percent: 45,
          isSliced: true
        }, {
          browser: "IE",
          percent: 26.8,
          isSliced: false
        }, {
          browser: "Chrome",
          percent: 12.8,
          isSliced: false
        }, {
          browser: "Safari",
          percent: 8.5,
          isSliced: false
        }, {
          browser: "Opera",
          percent: 6.2,
          isSliced: false
        }, {
          browser: "Other",
          percent: 0.7,
          isSliced: false
        }
      ];
    } else if (options.format === 'ducati') {
      if (state.cache != null) {
        state.cache.push(state.ducati(_.last(state.cache).id + 1));
        state.cache = _.tail(state.cache);
      } else {
        state.ducati = getDucatiFunction();
        state.cache = (function() {
          var i, results;
          results = [];
          for (num = i = 0; i <= 10; num = ++i) {
            results.push(state.ducati(num));
          }
          return results;
        })();
      }
    }
    q.resolve({
      '0': {
        data: state.cache,
        columns: null
      }
    });
    return q.promise;
  };
  return dataSourceFactory.create('mock', runner);
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
cyclotronDataSources.factory('splunkDataSource', ['$q', '$http', 'configService', 'dataSourceFactory', 'logService', function($q, $http, configService, dataSourceFactory, logService) {
  var getProxyRequest, getSplunkUrl, runner;
  getSplunkUrl = function(options) {
    var searchOptions, uri;
    searchOptions = {
      search: 'search ' + _.jsExec(options.query),
      output_mode: 'json_rows'
    };
    if (options.earliest != null) {
      searchOptions.earliest_time = _.jsExec(options.earliest);
    }
    if (options.latest != null) {
      searchOptions.latest_time = _.jsExec(options.latest);
    }
    uri = URI(_.compile(options.url, options)).search(searchOptions).toString();
    return uri;
  };
  getProxyRequest = function(options) {
    return {
      method: 'GET',
      json: false,
      url: getSplunkUrl(options),
      strictSSL: false,
      auth: {
        username: _.jsExec(options.username),
        password: _.jsExec(options.password)
      }
    };
  };
  runner = function(options) {
    var errorCallback, proxyUri, q, req, successCallback;
    q = $q.defer();
    errorCallback = function(error, status) {
      if (error === '' && status === 0) {
        error = 'Cross-Origin Resource Sharing error with the server.';
      }
      return q.reject(error);
    };
    successCallback = function(proxyResult) {
      var body, data, e, errorMessages, fields, results, splunkResult;
      data = [];
      fields = null;
      try {
        body = '[' + proxyResult.body.replace(/}{/g, '},{') + ']';
        results = JSON.parse(body);
        splunkResult = _.find(results, {
          preview: false
        }) || _.first(results);
      } catch (error1) {
        e = error1;
        logService.error('Unexpected response from Splunk: ' + proxyResult.body);
        splunkResult = null;
      }
      if (!_.isEmpty(results)) {
        if (!_.isObject(splunkResult)) {
          return errorCallback('Error retrieving data from Splunk', -1);
        }
        errorMessages = _(splunkResult.messages).filter(function(message) {
          return message.type === 'ERROR' || message.type === 'FATAL';
        }).pluck('text').value();
        if (!_.isEmpty(errorMessages)) {
          return errorCallback('Splunk Error: ' + errorMessages.join(', '), -1);
        }
        if (!_.isEmpty(splunkResult)) {
          fields = splunkResult.fields;
          data = _.map(splunkResult.rows, function(row) {
            return _.zipObject(fields, row);
          });
        }
      }
      return q.resolve({
        '0': {
          data: data,
          columns: fields
        }
      });
    };
    proxyUri = new URI(_.jsExec(options.proxy) || configService.restServiceUrl).protocol('').segment('proxy').toString();
    req = $http.post(proxyUri, getProxyRequest(options));
    req.success(successCallback);
    req.error(errorCallback);
    return q.promise;
  };
  return dataSourceFactory.create('Splunk', runner);
}]);


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
cyclotronServices.factory('cyclotronDataService', ['$http', 'configService', 'logService', function($http, configService, logService) {
  var checkBucketExists, createBucket, defaultUrl, ensureBucketExists;
  defaultUrl = configService.restServiceUrl;
  checkBucketExists = function(key, url) {
    var req;
    if (url == null) {
      url = defaultUrl;
    }
    logService.debug('CyclotronData: Checking if bucket exists:', key);
    url = url + '/data/' + encodeURIComponent(key);
    req = $http.get(url);
    return req.then(function(result) {
      return true;
    })["catch"](function(error) {
      return false;
    });
  };
  createBucket = function(key, data, url) {
    var req;
    if (data == null) {
      data = [];
    }
    if (url == null) {
      url = defaultUrl;
    }
    logService.debug('CyclotronData: Creating new bucket:', key);
    url = url + '/data';
    req = $http.post(url, {
      key: key,
      data: data
    });
    return req.then(function(result) {
      return result.data;
    });
  };
  ensureBucketExists = function(key, url) {
    if (url == null) {
      url = defaultUrl;
    }
    return checkBucketExists(key, url).then(function(result) {
      if (!result) {
        return createBucket(key, [], url);
      }
    });
  };
  return {
    getBuckets: function(url) {
      var req;
      if (url == null) {
        url = defaultUrl;
      }
      url = url + '/data';
      req = $http.get(url);
      return req.then(function(result) {
        return result.data;
      });
    },
    bucketExists: checkBucketExists,
    createBucket: createBucket,
    deleteBucket: function(key, url) {
      var req;
      if (url == null) {
        url = defaultUrl;
      }
      url = url + '/data/' + encodeURIComponent(key);
      return req = $http["delete"](url);
    },
    getBucket: function(key, url) {
      var req;
      if (url == null) {
        url = defaultUrl;
      }
      url = url + '/data/' + encodeURIComponent(key);
      req = $http.get(url);
      return req.then(function(result) {
        return result.data;
      })["catch"](function(error) {
        return null;
      });
    },
    getBucketData: function(key, url) {
      var req;
      if (url == null) {
        url = defaultUrl;
      }
      url = url + '/data/' + encodeURIComponent(key) + '/data';
      req = $http.get(url);
      return req.then(function(result) {
        return result.data;
      })["catch"](function(error) {
        return null;
      });
    },
    updateBucketData: function(key, data, url) {
      if (url == null) {
        url = defaultUrl;
      }
      return ensureBucketExists(key, url).then(function() {
        var req;
        url = url + '/data/' + encodeURIComponent(key) + '/data';
        req = $http.put(url, data);
        return req.then(function(result) {
          return result.data;
        });
      });
    },
    append: function(key, data, url) {
      if (url == null) {
        url = defaultUrl;
      }
      return ensureBucketExists(key, url).then(function() {
        var req;
        url = url + '/data/' + encodeURIComponent(key) + '/append';
        req = $http.post(url, data);
        return req.then(function(result) {
          return result.data;
        });
      });
    },
    upsert: function(key, matchingKeys, data, url) {
      if (url == null) {
        url = defaultUrl;
      }
      return ensureBucketExists(key, url).then(function() {
        var req;
        url = url + '/data/' + encodeURIComponent(key) + '/upsert';
        req = $http.post(url, {
          keys: matchingKeys,
          data: data
        });
        return req.then(function(result) {
          return result.data;
        });
      });
    },
    remove: function(key, matchingKeys, data, url) {
      if (url == null) {
        url = defaultUrl;
      }
      return ensureBucketExists(key, url).then(function() {
        var req;
        url = url + '/data/' + encodeURIComponent(key) + '/remove';
        req = $http.post(url, matchingKeys);
        return req.then(function(result) {
          return result.data;
        });
      });
    }
  };
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
cyclotronServices.factory('dashboardOverridesService', ['$localForage', '$q', '$window', 'configService', 'logService', function($localForage, $q, $window, configService, logService) {
  var expandOverrides, getLocalStorageKey, resetOverrides;
  getLocalStorageKey = function(dashboard) {
    return 'dashboardOverrides.' + dashboard.name;
  };
  resetOverrides = function() {
    return {
      pages: []
    };
  };
  expandOverrides = function(dashboard, dashboardOverrides) {
    if (dashboardOverrides.pages == null) {
      dashboardOverrides.pages = [];
    }
    _.each(dashboard.pages, function(page, index) {
      var base;
      if (dashboardOverrides.pages[index] == null) {
        dashboardOverrides.pages.push({
          widgets: []
        });
      }
      if ((base = dashboardOverrides.pages[index]).widgets == null) {
        base.widgets = [];
      }
      return _.each(page.widgets, function(widget, widgetIndex) {
        if (dashboardOverrides.pages[index].widgets[widgetIndex] == null) {
          return dashboardOverrides.pages[index].widgets.push({});
        }
      });
    });
    return dashboardOverrides;
  };
  return {
    initializeDashboardOverrides: function(dashboard) {
      return $q(function(resolve, reject) {
        return $localForage.getItem(getLocalStorageKey(dashboard)).then(function(dashboardOverrides) {
          if (_.isNull(dashboardOverrides)) {
            dashboardOverrides = resetOverrides();
          }
          dashboardOverrides = expandOverrides(dashboard, dashboardOverrides);
          logService.debug('Dashboard Overrides: ' + JSON.stringify(dashboardOverrides));
          return resolve(dashboardOverrides);
        })["catch"](function(error) {
          logService.error('Error loading Dashboard Overrides:', error);
          return reject(error);
        });
      });
    },
    expandOverrides: function(dashboard, dashboardOverrides) {
      return expandOverrides(dashboard, dashboardOverrides);
    },
    resetAndExpandOverrides: function(dashboard) {
      var dashboardOverrides;
      dashboardOverrides = resetOverrides();
      return expandOverrides(dashboard, dashboardOverrides);
    },
    saveDashboardOverrides: function(dashboard, dashboardOverrides) {
      return $localForage.setItem(getLocalStorageKey(dashboard), dashboardOverrides).then(function() {
        return logService.debug('Saved Dashboard Overrides to localstorage!');
      })["catch"](function(error) {
        return logService.error('Error saving Dashboard Overrides:', error);
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
cyclotronServices.factory('dataService', ['$injector', 'configService', function($injector, configService) {
  var defaultSortFunction, parseSortBy;
  defaultSortFunction = function(a, b, ascending) {
    if ((a == null) && (b == null)) {
      return 0;
    } else if ((a != null) && (b == null)) {
      if (ascending) {
        return 1;
      } else {
        return -1;
      }
    } else if ((a == null) && (b != null)) {
      if (ascending) {
        return -1;
      } else {
        return 1;
      }
    } else if (_.isBoolean(a) && _.isBoolean(b)) {
      if (a === b) {
        return 0;
      }
      if ((ascending && !a) || (!ascending && a)) {
        return 1;
      }
      return -1;
    } else if (_.isNumber(a)) {
      if (ascending) {
        return a - b;
      }
      return b - a;
    } else if (_.isString(a)) {
      if (ascending) {
        return a.localeCompare(b);
      }
      return b.localeCompare(a);
    } else {
      return 0;
    }
  };
  parseSortBy = function(columnName) {
    var ascending, firstChar;
    ascending = true;
    firstChar = columnName.charAt(0);
    if (firstChar === '+') {
      columnName = columnName.substring(1);
    } else if (firstChar === '-') {
      ascending = false;
      columnName = columnName.substring(1);
    }
    return {
      columnName: columnName,
      ascending: ascending
    };
  };
  return {
    get: function(dataSourceDefinition) {
      var dataSource, dataSourceProperties, name, ref, type;
      if (_.isNullOrUndefined(dataSourceDefinition)) {
        return;
      }
      if (_.isNullOrUndefined(dataSourceDefinition.type)) {
        return;
      }
      name = dataSourceDefinition.name;
      type = dataSourceDefinition.type.toLowerCase();
      if (Cyclotron.dataSources[name] == null) {
        dataSource = $injector.get(type + 'DataSource');
        dataSourceProperties = configService != null ? (ref = configService.dashboard.properties.dataSources.options[type]) != null ? ref.properties : void 0 : void 0;
        if (dataSourceProperties != null) {
          _.each(dataSourceProperties, function(property, name) {
            if (property["default"] != null) {
              return dataSourceDefinition[name] != null ? dataSourceDefinition[name] : dataSourceDefinition[name] = property["default"];
            }
          });
        }
        Cyclotron.dataSources[name] = dataSource.initialize(dataSourceDefinition);
      }
      return Cyclotron.dataSources[name];
    },
    filter: function(data, filters) {
      var compareRow, filtered, filters2, parseFilter;
      if (_.isEmpty(data) || !_.isArray(data)) {
        return data;
      }
      parseFilter = function(value) {
        value = _.jsExec(value);
        if (/^\/.*\/$/i.test(value)) {
          return new RegExp(value.substring(1, value.length - 1), 'i');
        }
        return value;
      };
      filters2 = {};
      _.each(filters, function(value, key) {
        var value2;
        key = _.jsExec(key);
        value2 = _.isArray(value) ? _.map(value, function(v) {
          return parseFilter(v);
        }) : parseFilter(value);
        return filters2[key] = value2;
      });
      compareRow = function(row) {
        return _.every(filters2, function(filterValue, key) {
          var value;
          value = row[key];
          if (filterValue === '*') {
            return !_.isEmpty(value);
          }
          if (_.isRegExp(filterValue)) {
            return !_.isEmpty(value) && filterValue.test(value);
          } else if (_.isArray(filterValue)) {
            return _.some(filterValue, function(arrayValue) {
              if (arrayValue === '*') {
                return !_.isEmpty(value);
              }
              if (_.isRegExp(arrayValue)) {
                return arrayValue.test(value);
              } else {
                return arrayValue === value;
              }
            });
          } else {
            return value === filterValue;
          }
        });
      };
      filtered = _.filter(data, compareRow);
      return filtered;
    },
    sort: function(data, sortBy) {
      var sortBy2, sorter;
      if (!((sortBy != null) && !_.isEmpty(data) && _.isArray(data))) {
        return data;
      }
      sorter = function(input) {
        var columnName, sortObj;
        if (_.isString(input)) {
          columnName = input;
          sortObj = parseSortBy(columnName);
          return data.sort(function(r1, r2) {
            var a, b;
            a = r1[sortObj.columnName];
            b = r2[sortObj.columnName];
            return defaultSortFunction(a, b, sortObj.ascending);
          });
        } else if (_.isFunction(input)) {
          return data.sort(function(r1, r2) {
            return input(r1, r2, defaultSortFunction);
          });
        }
      };
      if (_.isArray(sortBy)) {
        sortBy2 = _.map(sortBy, function(v) {
          return _.jsExec(v);
        });
        _.each(sortBy2.reverse(), function(column) {
          return sorter(column);
        });
        return data;
      } else {
        return sorter(_.jsExec(sortBy));
      }
    },
    parseSortBy: parseSortBy,
    defaultSortFunction: defaultSortFunction
  };
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
cyclotronServices.factory('downloadService', ['$http', '$q', '$localForage', '$window', 'analyticsService', 'configService', 'logService', function($http, $q, $localForage, $window, analyticsService, configService, logService) {
  var exports;
  exports = {
    download: function(name, format, data) {
      return $http.post(configService.restServiceUrl + '/export/data', {
        name: name,
        format: format,
        data: data
      }).then(function(result) {
        $window.location = result.data.url;
        return alertify.log('Downloaded Widget Data', 2500);
      })["catch"](function(error) {
        return alertify.error('Error downloading Widget data', 2500);
      });
    }
  };
  return exports;
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
cyclotronServices.factory('layoutService', function() {
  return {
    getLayout: function(dashboardPage, containerWidth, containerHeight) {
      var calculateSquareHeight, calculateSquareWidth, layout, reducePadding, updateInnerHeight, updateInnerWidth;
      layout = {
        width: containerWidth,
        height: containerHeight,
        gridSquareMin: 180,
        gridSquareMax: 300,
        gridSquareMid: 220,
        gridWidthAdjustment: dashboardPage.layout.gridWidthAdjustment || 0,
        gridHeightAdjustment: dashboardPage.layout.gridHeightAdjustment || 0,
        margin: dashboardPage.layout.margin,
        gutter: dashboardPage.layout.gutter,
        borderWidth: dashboardPage.layout.borderWidth,
        forceGridWidth: null,
        forceGridHeight: null,
        originalGridRows: dashboardPage.layout.gridRows,
        originalGridColumns: dashboardPage.layout.gridColumns,
        scrolling: dashboardPage.layout.scrolling,
        widget: {}
      };
      if (dashboardPage.style === 'fullscreen') {
        layout.margin = 0;
      }
      updateInnerWidth = function() {
        return layout.innerWidth = layout.width + layout.gridWidthAdjustment - (layout.margin * 2);
      };
      updateInnerHeight = function() {
        return layout.innerHeight = layout.height + layout.gridHeightAdjustment - (layout.margin * 2);
      };
      calculateSquareWidth = function(gridColumns) {
        var innerWidthMinusGutters;
        layout.gridColumns = gridColumns;
        updateInnerWidth();
        innerWidthMinusGutters = layout.innerWidth - ((gridColumns - 1) * layout.gutter);
        return layout.gridSquareWidth = innerWidthMinusGutters / gridColumns;
      };
      calculateSquareHeight = function(gridRows) {
        var innerHeightMinusGutters;
        layout.gridRows = gridRows;
        updateInnerHeight();
        innerHeightMinusGutters = layout.innerHeight - ((gridRows - 1) * layout.gutter);
        return layout.gridSquareHeight = innerHeightMinusGutters / gridRows;
      };
      reducePadding = function() {
        layout.gutter = Math.min(6, dashboardPage.layout.gutter);
        return layout.margin = Math.min(6, dashboardPage.layout.margin);
      };
      if (layout.width <= 400 && layout.width < layout.height) {
        layout.gridHeightAdjustment = 0;
        layout.gridWidthAdjustment = 0;
        layout.width -= 16;
        reducePadding();
        calculateSquareWidth(1);
        layout.forceGridWidth = 1;
        calculateSquareHeight(Math.min(2, dashboardPage.layout.gridRows));
        layout.forceGridHeight = 1;
      } else if (layout.height <= 400 && layout.width > layout.height) {
        layout.gridHeightAdjustment = 0;
        layout.gridWidthAdjustment = 0;
        layout.width -= 16;
        reducePadding();
        calculateSquareWidth(Math.min(2, dashboardPage.layout.gridColumns));
        layout.forceGridWidth = 1;
        calculateSquareHeight(1);
        layout.forceGridHeight = 1;
      } else {
        layout.forceGridWidth = null;
        layout.forceGridHeight = null;
        if (dashboardPage.layout.gridColumns != null) {
          calculateSquareWidth(dashboardPage.layout.gridColumns);
        } else {
          updateInnerWidth();
          calculateSquareWidth(Math.ceil(layout.innerWidth / layout.gridSquareMid));
          if (layout.gridSquareWidth < layout.gridSquareMin) {
            calculateSquareWidth(--layout.gridColumns);
          }
        }
        if (dashboardPage.layout.gridRows != null) {
          calculateSquareHeight(dashboardPage.layout.gridRows);
        } else {
          layout.gridSquareHeight = layout.gridSquareWidth;
        }
      }
      layout.gridSquareWidth = Math.floor(layout.gridSquareWidth);
      layout.gridSquareHeight = Math.floor(layout.gridSquareHeight);
      return layout;
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
cyclotronServices.factory('parameterService', ['$localForage', '$q', '$window', 'configService', 'logService', function($localForage, $q, $window, configService, logService) {
  var getLocalStorageKey, isSet, setValue, tryLoadDefaultValue;
  getLocalStorageKey = function(dashboard, parameterDefinition) {
    return 'param.' + dashboard.name + '.' + parameterDefinition.name;
  };
  isSet = function(parameterDefinition) {
    return $window.Cyclotron.parameters[parameterDefinition.name] != null;
  };
  setValue = function(parameterDefinition, value) {
    return $window.Cyclotron.parameters[parameterDefinition.name] = value;
  };
  tryLoadDefaultValue = function(parameterDefinition) {
    var value;
    if (parameterDefinition.defaultValue == null) {
      return;
    }
    value = _.jsExec(parameterDefinition.defaultValue);
    if (value == null) {
      return;
    }
    logService.debug('Assigned parameter with default value: ' + parameterDefinition.name + ', ' + value);
    return setValue(parameterDefinition, value);
  };
  return {
    initializeParameters: function(dashboard) {
      return $q(function(resolve, reject) {
        var qs;
        if ((dashboard != null ? dashboard.parameters : void 0) == null) {
          resolve();
        }
        qs = _.map(dashboard.parameters, function(parameter) {
          return $q(function(resolve, reject) {
            if (isSet(parameter)) {
              return resolve();
            }
            if (parameter.persistent === true) {
              return $localForage.getItem(getLocalStorageKey(dashboard, parameter)).then(function(value) {
                if (value != null) {
                  logService.debug('Loaded parameter from localstorage: ' + parameter.name + ', ' + value);
                  setValue(parameter, value);
                } else {
                  tryLoadDefaultValue(parameter);
                }
                return resolve();
              });
            } else {
              tryLoadDefaultValue(parameter);
              return resolve();
            }
          });
        });
        return $q.all(qs).then(function() {
          _.each($window.Cyclotron.parameters, function(value, key) {
            return logService.info('Initial Parameter [' + key + ']: ' + value);
          });
          return resolve();
        });
      });
    },
    savePersistentParameters: function(parameters, dashboard) {
      var persistentParams;
      logService.debug('Saving persistent parameters to local browser storage');
      persistentParams = _.filter(dashboard.parameters, {
        persistent: true
      });
      return _.each(persistentParams, function(parameterDefinition) {
        var value;
        value = parameters[parameterDefinition.name];
        if (value != null) {
          return $localForage.setItem(getLocalStorageKey(dashboard, parameterDefinition), value).then(function() {
            return logService.debug('Saved parameter to localstorage: ' + parameterDefinition.name + ', ' + value);
          });
        } else {
          return $localForage.removeItem(getLocalStorageKey(dashboard, parameterDefinition)).then(function() {
            return logService.debug('Removed parameter from localstorage: ' + parameterDefinition.name);
          });
        }
      });
    }
  };
}]);


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
cyclotronDirectives.directive('dashboard', ['$compile', '$window', '$timeout', 'configService', 'layoutService', 'logService', function($compile, $window, $timeout, configService, layoutService, logService) {
  return {
    restrict: 'C',
    link: function(scope, element, attrs) {
      var $dashboardControls, $dashboardSidebar, $element, calculateMouseTarget, controlHitTest, controlTarget, controlTimer, makeControlsAppear, makeControlsDisappear;
      $element = $(element);
      $dashboardSidebar = $element.children('.dashboard-sidebar');
      $dashboardControls = $element.children('.dashboard-controls');
      controlTimer = null;
      controlTarget = null;
      calculateMouseTarget = function() {
        var controlHeight, controlOffset, controlWidth, padX, padY;
        controlOffset = $dashboardControls.offset();
        controlWidth = $dashboardControls.width();
        controlHeight = $dashboardControls.height();
        padX = configService.dashboard.controls.hitPaddingX;
        padY = configService.dashboard.controls.hitPaddingY;
        if (!(($dashboardControls != null) && (controlOffset != null))) {
          return;
        }
        return controlTarget = {
          top: controlOffset.top - padY,
          bottom: controlOffset.top + controlHeight + padY,
          left: controlOffset.left - padX,
          right: controlOffset.left + controlWidth + padX
        };
      };
      makeControlsDisappear = function() {
        return $dashboardControls.removeClass('active');
      };
      makeControlsAppear = _.throttle(function() {
        $dashboardControls.addClass('active');
        if (controlTimer != null) {
          $timeout.cancel(controlTimer);
        }
        return controlTimer = $timeout(makeControlsDisappear, configService.dashboard.controls.duration);
      }, 500, {
        leading: true
      });
      controlHitTest = function(event) {
        if (controlTarget == null) {
          return;
        }
        if (event.pageX < controlTarget.left || event.pageX > controlTarget.right || event.pageY < controlTarget.top || event.pageY > controlTarget.bottom) {
          return;
        }
        return makeControlsAppear();
      };
      calculateMouseTarget();
      $(document).on('mousemove', controlHitTest);
      $(document).on('scroll', calculateMouseTarget);
      $(window).on('resize', _.debounce(calculateMouseTarget, 500, {
        leading: false
      }));
      scope.$on('$destroy', function() {
        $(document).off('mousemove', controlHitTest);
        $(document).off('scroll', calculateMouseTarget);
        $(window).off('resize', calculateMouseTarget);
        if (controlTimer != null) {
          return $timeout.cancel(controlTimer);
        }
      });
    }
  };
}]);


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
cyclotronDirectives.directive('dashboardPage', ['$compile', '$window', '$timeout', 'configService', 'layoutService', 'logService', function($compile, $window, $timeout, configService, layoutService, logService) {
  return {
    replace: true,
    restrict: 'E',
    scope: {
      page: '=',
      pageOverrides: '=',
      pageNumber: '@',
      dashboard: '='
    },
    template: '<div class="dashboard-page dashboard-{{page.theme}} {{page.style}}">' + '<div class="dashboard-page-inner">' + '<div class="dashboard-widgetwrapper dashboard-{{widget.theme}} theme-variant-{{widget.themeVariant}}" ng-repeat="widget in sortedWidgets track by widget.uid"' + ' widget="widget" page="page" page-overrides="pageOverrides" widget-index="$index" layout="layout" dashboard="dashboard" post-layout="postLayout()"></div>' + '</div></div>',
    link: function(scope, element, attrs) {
      var $dashboard, $dashboardControls, $dashboardPageInner, $dashboardSidebar, $element, masonry, resortWidgets, updatePage;
      $element = $(element);
      $dashboard = $element.parents('.dashboard');
      $dashboardPageInner = $element.children('.dashboard-page-inner');
      $dashboardControls = $dashboard.find('.dashboard-controls');
      $dashboardSidebar = $dashboard.find('.dashboard-sidebar');
      masonry = function() {
        if (scope.layout == null) {
          return;
        }
        return $dashboardPageInner.masonry({
          itemSelector: '.dashboard-widgetwrapper',
          columnWidth: scope.layout.gridSquareWidth,
          gutter: scope.layout.gutter,
          resize: false,
          transitionDuration: '0.1s',
          stagger: 5
        });
      };
      resortWidgets = function() {
        var ref, sortedWidgets, widgetOverrides;
        if (((ref = scope.pageOverrides) != null ? ref.widgets : void 0) != null) {
          widgetOverrides = scope.pageOverrides.widgets;
          sortedWidgets = _.map(scope.page.widgets, function(widget, index) {
            widget = _.cloneDeep(widget);
            widget._originalIndex = index;
            if (widgetOverrides[index].indexOverride != null) {
              widget._index = widgetOverrides[index].indexOverride;
            } else {
              widget._index = index;
            }
            return widget;
          });
          return scope.sortedWidgets = _.sortBy(sortedWidgets, '_index');
        } else {
          return scope.sortedWidgets = scope.page.widgets;
        }
      };
      updatePage = function() {
        var color, ref, resizeFunction, themeSettings, updateLayout;
        scope.page.widgets = ((ref = scope.page) != null ? ref.widgets : void 0) || [];
        _.each(scope.page.widgets, function(widget) {
          if (widget.uid == null) {
            widget.uid = uuid.v4();
          }
        });
        scope.page.widgets = _.map(scope.page.widgets, function(widget) {
          var indices, linkedWidget, pageIndex, ref1, widgetIndex;
          if (widget.widget === 'linkedWidget') {
            indices = widget.linkedWidget.split(',');
            pageIndex = parseInt(indices[0]);
            widgetIndex = parseInt(indices[1]);
            linkedWidget = (ref1 = scope.dashboard.pages[pageIndex]) != null ? ref1.widgets[widgetIndex] : void 0;
            widget = _.defaults(widget, linkedWidget);
            widget.widget = linkedWidget.widget;
            return widget;
          } else {
            return widget;
          }
        });
        resortWidgets();
        updateLayout = function() {
          var containerHeight, containerWidth;
          scope.postLayout = _.after(scope.page.widgets.length, function() {
            if (scope.page.enableMasonry !== false) {
              masonry();
            }
          });
          containerWidth = $dashboard.innerWidth();
          containerHeight = $($window).height();
          scope.layout = layoutService.getLayout(scope.page, containerWidth, containerHeight);
          if (!_.isNullOrUndefined(scope.layout.margin)) {
            $element.css('padding', scope.layout.margin + 'px');
          }
          $dashboardPageInner.css({
            marginRight: '-' + scope.layout.gutter + 'px',
            marginBottom: '-' + scope.layout.gutter + 'px'
          });
          if (!scope.layout.scrolling) {
            return $element.parents().addClass('fullscreen');
          } else {
            return $element.parents().removeClass('fullscreen');
          }
        };
        updateLayout();
        resizeFunction = _.throttle(function() {
          return scope.$apply(updateLayout);
        }, 65);
        $element.on('resize', resizeFunction);
        scope.$on('$destroy', function() {
          return $element.off('resize', resizeFunction);
        });
        $dashboard.addClass('dashboard-' + scope.page.theme);
        $dashboardControls.addClass('dashboard-' + scope.page.theme);
        themeSettings = configService.dashboard.properties.theme.options[scope.page.theme];
        if ((scope.page.theme != null) && (themeSettings != null)) {
          color = themeSettings.dashboardBackgroundColor;
          $('html').css('background-color', color);
        }
      };
      scope.$watch('page', function(page, oldValue) {
        if (_.isUndefined(page)) {
          return;
        }
        return updatePage();
      });
      scope.$watch('pageOverrides', function(pageOverrides, previous) {
        if (_.isEqual(pageOverrides, previous)) {
          return;
        }
        resortWidgets();
        $timeout(function() {
          $dashboardPageInner.masonry('reloadItems');
          return $dashboardPageInner.masonry();
        }, 30);
      }, true);
      scope.$on('$destroy', function() {
        if ($dashboardPageInner.data('masonry')) {
          return $dashboardPageInner.masonry('destroy');
        }
      });
    }
  };
}]);


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
cyclotronDirectives.directive('dashboardSidebar', ['$timeout', 'layoutService', function($timeout, layoutService) {
  return {
    restrict: 'EAC',
    link: function(scope, element, attrs) {
      var $accordion, $clickCover, $element, $expander, $expanderIcon, $footer, $header, $hitbox, $parent, isSidebarExpanded, ref, sizer, timer, updateExpandedState;
      isSidebarExpanded = false;
      scope.sidebarContent = _.cloneDeep(scope.dashboard.sidebar.sidebarContent);
      if (((ref = scope.sidebarContent) != null ? ref.length : void 0) > 0) {
        scope.sidebarContent[0].isOpen = true;
      } else {
        scope.isShowHideWidgetsOpen = true;
      }
      $element = $(element);
      $parent = $element.parent();
      $header = $element.find('.sidebar-header');
      $accordion = $element.find('.sidebar-accordion');
      $footer = $element.find('.sidebar-footer');
      $hitbox = $element.find('.sidebar-expander-hitbox');
      $expander = $element.find('.sidebar-expander');
      $expanderIcon = $expander.children('i');
      $clickCover = $parent.find('.click-cover');
      updateExpandedState = function() {
        if (isSidebarExpanded) {
          $element.removeClass('collapsed');
          $clickCover.css('display', 'block');
          $expanderIcon.removeClass('fa-caret-right');
          $expanderIcon.addClass('fa-caret-left');
          return $hitbox.attr('title', 'Click to collapse the sidebar');
        } else {
          $element.addClass('collapsed');
          $clickCover.css('display', 'none');
          $expanderIcon.removeClass('fa-caret-left');
          $expanderIcon.addClass('fa-caret-right');
          return $hitbox.attr('title', 'Click to expand the sidebar');
        }
      };
      $hitbox.on('click', function(event) {
        event.preventDefault();
        isSidebarExpanded = !isSidebarExpanded;
        return updateExpandedState();
      });
      $clickCover.on('click', function(event) {
        event.preventDefault();
        isSidebarExpanded = false;
        return updateExpandedState();
      });
      sizer = function() {
        return $accordion.height($element.outerHeight() - $header.outerHeight() - $footer.outerHeight());
      };
      $element.on('resize', _.debounce(sizer, 300, {
        leading: false,
        maxWait: 600
      }));
      timer = $timeout(sizer, 100);
      scope.$on('$destroy', function() {
        $timeout.cancel(timer);
        return $element.off('resize');
      });
    },
    controller: ['$scope', '$window', 'configService', 'dashboardOverridesService', 'dashboardService', function($scope, $window, configService, dashboardOverridesService, dashboardService) {
      var calculateOverrides, ref, ref1;
      $scope.footerLogos = ((ref = configService.dashboardSidebar) != null ? (ref1 = ref.footer) != null ? ref1.logos : void 0 : void 0) || [];
      $scope.calculatedWidgets = [];
      $scope.widgetOverrides = [];
      $scope.allWidgetsVisible = false;
      calculateOverrides = function() {
        var actualWidgets, ref2, ref3, ref4, visibleWidgets;
        actualWidgets = (ref2 = $scope.currentPage[0]) != null ? ref2.widgets : void 0;
        $scope.widgetOverrides = (ref3 = $scope.dashboardOverrides) != null ? (ref4 = ref3.pages[$scope.currentPageIndex]) != null ? ref4.widgets : void 0 : void 0;
        $scope.calculatedWidgets = _.map(actualWidgets, function(widget, index) {
          var indexOverride, ref5, ref6, ref7, ref8, visible;
          visible = true;
          if (((ref5 = $scope.widgetOverrides) != null ? ref5[index].hidden : void 0) != null) {
            visible = !((ref6 = $scope.widgetOverrides) != null ? ref6[index].hidden : void 0);
          } else if (widget.hidden) {
            visible = false;
          }
          if (((ref7 = $scope.widgetOverrides) != null ? ref7[index].indexOverride : void 0) != null) {
            indexOverride = (ref8 = $scope.widgetOverrides) != null ? ref8[index].indexOverride : void 0;
          } else {
            indexOverride = index;
          }
          return {
            label: dashboardService.getWidgetName(widget, index),
            visible: visible,
            index: index,
            indexOverride: indexOverride
          };
        });
        visibleWidgets = _.filter($scope.calculatedWidgets, {
          visible: true
        }).length;
        $scope.allWidgetsVisible = (visibleWidgets / $scope.calculatedWidgets.length) > 0.5;
        return $scope.calculatedWidgets = _.sortBy($scope.calculatedWidgets, 'indexOverride');
      };
      $scope.moveWidget = function(index) {
        $scope.calculatedWidgets.splice(index, 1);
        return _.each($scope.calculatedWidgets, function(widgetOverride, index) {
          widgetOverride.indexOverride = index;
          $scope.widgetOverrides[widgetOverride.index].indexOverride = index;
        });
      };
      $scope.changeVisibility = function(widgetOverride) {
        if (widgetOverride.visible === true) {
          $scope.widgetOverrides[widgetOverride.index].hidden = false;
        } else {
          $scope.widgetOverrides[widgetOverride.index].hidden = true;
        }
      };
      $scope.toggleAllWidgets = function() {
        _.each($scope.widgetOverrides, function(widgetOverride) {
          widgetOverride.hidden = $scope.allWidgetsVisible;
        });
      };
      $scope.$watchCollection('currentPage', function(currentPage) {
        if (!((currentPage != null ? currentPage.length : void 0) > 0)) {
          return;
        }
        return calculateOverrides();
      });
      return $scope.$watch('dashboardOverrides', function(dashboardOverrides) {
        if (dashboardOverrides == null) {
          return;
        }
        return calculateOverrides();
      }, true);
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
cyclotronDirectives.directive('dashboardWidget', ['layoutService', function(layoutService) {
  return {
    restrict: 'AC',
    link: function(scope, element, attrs) {
      var $element, $parent;
      $element = $(element);
      $parent = $element.parent();
      scope.$watch('widget', function(widget) {
        if (widget.allowFullscreen) {
          $parent.find('.widget-fullscreen').on('click', function() {
            return $element.fullScreen(true);
          });
        }
      });
      scope.$watch('layout', function(layout) {
        if (layout == null) {
          return;
        }
        if (layout.borderWidth != null) {
          return $element.css('border-width', layout.borderWidth + 'px');
        }
      });
    }
  };
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
cyclotronDirectives.directive('datetimepicker', ['$timeout', function($timeout) {
  return {
    restrict: 'EAC',
    require: '?ngModel',
    template: '<input type="text">',
    scope: {
      options: '='
    },
    link: function(scope, element, attrs, ngModelCtrl) {
      var defaultOptions, mergedOptions, textbox;
      textbox = element.find('input[type=text]');
      defaultOptions = {
        scrollMonth: false,
        format: 'Y-m-d H:i',
        formatDate: 'Y-m-d',
        formatTime: 'H:i',
        onChangeDateTime: function(value, input) {
          if (ngModelCtrl != null) {
            scope.$apply(function() {
              var formatted;
              ngModelCtrl.$setViewValue(value);
              ngModelCtrl.$render();
              formatted = moment(value).format(mergedOptions.datetimeFormat);
              return textbox.val(formatted);
            });
          }
        }
      };
      mergedOptions = _.merge(defaultOptions, scope.options);
      if (ngModelCtrl != null) {
        ngModelCtrl.$render = function() {
          mergedOptions.value = moment(ngModelCtrl.$viewValue).toDate();
          element.datetimepicker(mergedOptions);
        };
        ngModelCtrl.$formatters.push(function(modelValue) {
          var formatted, m;
          if (modelValue) {
            m = null;
            if (moment.isMoment(modelValue)) {
              m = modelValue;
            } else if (moment.isDate(modelValue)) {
              m = moment(modelValue);
            } else {
              m = moment(modelValue, [mergedOptions.datetimeFormat, moment.ISO_8601]);
            }
            formatted = m.format(mergedOptions.datetimeFormat);
            textbox.val(formatted);
            return m.toDate();
          }
        });
        ngModelCtrl.$parsers.push(function(viewValue) {
          var formatted;
          if (viewValue) {
            formatted = moment(viewValue).format(mergedOptions.datetimeFormat);
            return formatted;
          }
        });
      }
      textbox.on('keyup', function(e) {
        var m, modelValue;
        if (ngModelCtrl != null) {
          modelValue = this.value;
          m = moment(modelValue, mergedOptions.datetimeFormat);
          if (m.isValid()) {
            return scope.$apply(function() {
              ngModelCtrl.$setViewValue(m.toDate());
              return ngModelCtrl.$render();
            });
          }
        }
      });
    }
  };
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
cyclotronDirectives.directive('sidebarAccordion', ['$sce', '$timeout', function($sce, $timeout) {
  return {
    restrict: 'EAC',
    controller: ['$scope', '$attrs', function($scope, $attrs) {
      var that;
      this.groups = [];
      $scope.trustHtml = function(html) {
        return $sce.trustAsHtml(html);
      };
      this.closeOthers = function(openGroup) {
        angular.forEach(this.groups, function(group) {
          if (group !== openGroup) {
            return group.isOpen = false;
          }
        });
        return this.calcHeight();
      };
      that = this;
      $scope.$watch('accordionHeight', function(value) {
        return that.calcHeight();
      });
      this.calcHeight = function() {
        var height;
        height = _.reduce(this.groups, function(sum, group) {
          return sum + group.returnHeight();
        }, 0);
        return that.panelHeight = $scope.getAccordionHeight() - height;
      };
      this.addGroup = function(groupScope) {
        that = this;
        this.groups.push(groupScope);
        return groupScope.$on('$destroy', function(event) {
          return that.removeGroup(groupScope);
        });
      };
      this.removeGroup = function(group) {
        var index;
        index = this.groups.indexOf(group);
        if (index !== -1) {
          return this.groups.splice(index, 1);
        }
      };
    }],
    transclude: true,
    replace: false,
    templateUrl: '/partials/sidebarAccordion.html',
    link: function(scope, element, attrs) {
      var sizer, timer;
      scope.getAccordionHeight = function() {
        return $(element).height();
      };
      sizer = function() {
        return scope.accordionHeight = scope.getAccordionHeight();
      };
      $(element).on('resize', _.debounce(function() {
        return scope.$apply(sizer);
      }, 100));
      timer = $timeout(sizer, 100);
      return scope.$on('$destroy', function() {
        $timeout.cancel(timer);
        return $(element).off('resize');
      });
    }
  };
}]);

cyclotronDirectives.directive('accordionGroup', function() {
  return {
    require: '^sidebarAccordion',
    restrict: 'EA',
    transclude: true,
    replace: true,
    templateUrl: '/partials/sidebarAccordionGroup.html',
    scope: {
      heading: '@',
      isOpen: '=?',
      isDisabled: '=?'
    },
    controller: function() {
      return this.setHeading = function(element) {
        return this.heading = element;
      };
    },
    link: function(scope, element, attrs, accordionController) {
      accordionController.addGroup(scope);
      scope.$watch('isOpen', function(value) {
        if (value) {
          return accordionController.closeOthers(scope);
        }
      });
      scope.toggleOpen = function() {
        if (!scope.isDisabled) {
          return scope.isOpen = !scope.isOpen;
        }
      };
      scope.returnHeight = function() {
        return element.find('.panel-heading').outerHeight(true);
      };
      return scope.$watch((function() {
        return accordionController.panelHeight;
      }), function(value) {
        if (value) {
          return scope.styles = {
            height: accordionController.panelHeight + 'px'
          };
        }
      });
    }
  };
});

cyclotronDirectives.directive('accordionHeading', function() {
  return {
    restrict: 'EA',
    transclude: true,
    template: '',
    replace: true,
    require: '^accordionGroup',
    link: function(scope, element, attr, accordionGroupController, transclude) {
      return accordionGroupController.setHeading(transclude(scope, function() {}));
    }
  };
});

cyclotronDirectives.directive('accordionTransclude', function() {
  return {
    require: '^accordionGroup',
    link: function(scope, element, attr, controller) {
      return scope.$watch((function() {
        return controller[attr.accordionTransclude];
      }), function(heading) {
        if (heading) {
          element.html('');
          return element.append(heading);
        }
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
cyclotronDirectives.directive('widget', ['$compile', '$sce', '$window', 'downloadService', 'layoutService', function($compile, $sce, $window, downloadService, layoutService) {
  return {
    restrict: 'A',
    scope: {
      widget: '=',
      widgetIndex: '=',
      layout: '=',
      dashboard: '=',
      page: '=',
      pageOverrides: '=',
      postLayout: '&'
    },
    templateUrl: '/partials/widget.html',
    link: function(scope, element, attrs) {
      var $element, isWidgetHidden, updateLayout;
      $element = $(element);
      scope.$sce = $sce;
      scope.widgetLayout = {};
      updateLayout = function(layout) {
        var widgetGridHeight, widgetGridWidth, widgetHeight, widgetWidth;
        if (_.isUndefined(layout)) {
          return scope.postLayout();
        }
        if (isWidgetHidden()) {
          $element.css('display', 'none');
          return scope.postLayout();
        }
        if (layout.forceGridWidth != null) {
          if (scope.widget.gridWidth === layout.originalGridColumns) {
            widgetGridWidth = layout.gridColumns;
          } else {
            widgetGridWidth = layout.forceGridWidth;
          }
          widgetWidth = null;
        } else {
          widgetGridWidth = scope.widget.gridWidth;
          widgetWidth = scope.widget.width;
        }
        if (layout.forceGridHeight != null) {
          if (scope.widget.gridHeight === layout.originalGridRows) {
            widgetGridHeight = layout.gridRows;
          } else {
            widgetGridHeight = layout.forceGridHeight;
          }
          widgetHeight = null;
        } else {
          widgetGridHeight = scope.widget.gridHeight;
          widgetHeight = scope.widget.height;
        }
        if (widgetHeight != null) {
          widgetHeight = scope.widget.height;
        } else if (widgetGridHeight != null) {
          widgetHeight = layout.gridSquareHeight * widgetGridHeight + (layout.gutter * (widgetGridHeight - 1));
        }
        if (widgetWidth != null) {
          widgetWidth = scope.widget.width;
        } else if (widgetGridWidth != null) {
          widgetWidth = layout.gridSquareWidth * widgetGridWidth + (layout.gutter * (widgetGridWidth - 1));
        } else {
          widgetWidth = layout.gridSquareWidth;
        }
        if (_.isNumber(widgetWidth)) {
          widgetWidth = Math.floor(widgetWidth);
        }
        $element.width(widgetWidth);
        if (scope.widget.autoHeight !== true) {
          if (_.isNumber(widgetHeight)) {
            widgetHeight = Math.floor(widgetHeight);
          }
          $element.height(widgetHeight);
        }
        $element.css('display', 'block');
        if (widgetWidth < widgetHeight) {
          $element.addClass('widget-skinny');
        } else {
          $element.removeClass('widget-skinny');
        }
        $element.css('margin-bottom', layout.gutter);
        scope.postLayout();
      };
      isWidgetHidden = function() {
        var ref, widgetOverrides;
        if (scope.widget == null) {
          return false;
        }
        if (((ref = scope.pageOverrides) != null ? ref.widgets : void 0) != null) {
          widgetOverrides = scope.pageOverrides.widgets[scope.widget._originalIndex];
          if ((widgetOverrides != null ? widgetOverrides.hidden : void 0) != null) {
            return widgetOverrides.hidden === true;
          }
        }
        return scope.widget.hidden === true;
      };
      if (scope.widget.name != null) {
        $window.Cyclotron.currentPage.widgets[scope.widget.name] = {
          show: function() {
            return scope.$evalAsync(function() {
              var ref, ref1, widgetOverrides;
              widgetOverrides = (ref = scope.pageOverrides) != null ? (ref1 = ref.widgets) != null ? ref1[scope.widget._originalIndex] : void 0 : void 0;
              return widgetOverrides.hidden = false;
            });
          },
          hide: function() {
            return scope.$evalAsync(function() {
              var ref, ref1, widgetOverrides;
              widgetOverrides = (ref = scope.pageOverrides) != null ? (ref1 = ref.widgets) != null ? ref1[scope.widget._originalIndex] : void 0 : void 0;
              return widgetOverrides.hidden = true;
            });
          },
          toggleVisibility: function() {
            return scope.$evalAsync(function() {
              var ref, ref1, widgetOverrides;
              widgetOverrides = (ref = scope.pageOverrides) != null ? (ref1 = ref.widgets) != null ? ref1[scope.widget._originalIndex] : void 0 : void 0;
              return widgetOverrides.hidden = !widgetOverrides.hidden;
            });
          },
          exportData: function(format) {
            return scope.exportData(format);
          }
        };
      }
      scope.$watch('widget', function(newValue, oldValue) {
        var widget;
        widget = newValue;
        if (scope.widgetContext == null) {
          scope.widgetContext = {
            loading: false,
            dataSourceError: false,
            dataSourceErrorMessage: null,
            nodata: null
          };
        }
        if (_.isEmpty(widget.widget)) {
          return;
        }
        scope.widgetTemplateUrl = '/widgets/' + widget.widget + '/' + widget.widget + '.html';
        if (widget.helpText != null) {
          scope.widgetContext.helpText = _.jsExec(widget.helpText);
        } else {
          scope.widgetContext.helpText = null;
        }
        scope.widgetContext.allowFullscreen = widget.allowFullscreen !== false;
        scope.widgetContext.allowExport = widget.allowExport !== false;
        scope.widgetClass = '';
        if (widget.style) {
          scope.widgetClass += newValue.style;
        }
        if (widget.noscroll === true) {
          scope.widgetClass += ' widget-noscroll';
        }
      });
      scope.$watch('layout', updateLayout);
      scope.$watch('pageOverrides', (function() {
        return updateLayout(scope.layout);
      }), true);
    },
    controller: ['$scope', 'dataService', function($scope, dataService) {
      $scope.showDropdown = function() {
        var ref;
        return (ref = $scope.widgetContext) != null ? ref.allowExport : void 0;
      };
      $scope.widgetTitle = function() {
        return _.jsExec($scope.widget.title);
      };
      $scope.isLoading = function() {
        return $scope.widgetContext.loading;
      };
      $scope.noDataOrError = function() {
        return $scope.widgetContext.nodata || $scope.widgetContext.dataSourceError;
      };
      $scope.filterAndSortWidgetData = function(data) {
        if ($scope.widget.filters != null) {
          data = dataService.filter(data, $scope.widget.filters);
        }
        if ($scope.widget.sortBy != null) {
          data = dataService.sort(data, $scope.widget.sortBy);
        }
        if (_.isEmpty(data) && ($scope.widget.noData != null)) {
          $scope.widgetContext.nodata = _.jsExec($scope.widget.noData);
          $scope.widgetContext.data = null;
          $scope.widgetContext.allowExport = false;
        } else {
          $scope.widgetContext.nodata = null;
          $scope.widgetContext.data = data;
          $scope.widgetContext.allowExport = $scope.widget.allowExport !== false;
        }
        return $scope.widgetContext.data;
      };
      $scope.exportData = function(format) {
        var name;
        if (!$scope.widgetContext.data) {
          return;
        }
        name = _.isString($scope.widget.dataSource) ? name = $scope.widget.dataSource : $scope.dashboard.name;
        return downloadService.download(name, format, $scope.widgetContext.data);
      };
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
cyclotronDirectives.directive('widgetBody', ['$timeout', function($timeout) {
  return {
    restrict: 'C',
    link: function(scope, element, attrs) {
      var $widget, $widgetBody, sizer, timer;
      $widgetBody = $(element);
      $widget = $widgetBody.parent();
      sizer = function() {
        var $footer, $title, widgetBodyHeight;
        $title = $widget.find('.title');
        $footer = $widget.find('.widget-footer');
        widgetBodyHeight = $widget.outerHeight() - $title.outerHeight() - $footer.outerHeight();
        widgetBodyHeight -= parseInt($widgetBody.css('marginTop')) + parseInt($widgetBody.css('marginBottom'));
        $widgetBody.height(Math.floor(widgetBodyHeight));
        if (scope.widgetLayout != null) {
          return scope.widgetLayout.widgetBodyHeight = widgetBodyHeight;
        }
      };
      $widget.add('.title, .widget-footer').on('resize', _.debounce(function() {
        return scope.$apply(function() {
          return sizer();
        });
      }, 120, {
        leading: false,
        maxWait: 500
      }));
      sizer();
      timer = $timeout(sizer, 100);
      scope.$on('$destroy', function() {
        $timeout.cancel(timer);
        return $widget.off('resize');
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
cyclotronDirectives.directive('widgetError', ['$timeout', function($timeout) {
  return {
    restrict: 'C',
    replace: false,
    templateUrl: '/partials/widgetError.html',
    link: function(scope, element, attrs) {
      var $bang, $errorContainer, $message, $reload, $widget, $widgetError, sizer, timer;
      $widgetError = $(element);
      $errorContainer = $widgetError.find('.widget-error-container');
      $widget = $widgetError.parent();
      $bang = $widgetError.find('.fa-exclamation');
      $reload = $widgetError.find('.widget-reload');
      $message = $widgetError.find('.widget-error-message');
      sizer = function() {
        var $footer, $title, bangSize, errorMessageLength, reloadSize, topPadding, widgetBodyHeight;
        $title = $widget.find('.title');
        $footer = $widget.find('.widget-footer');
        widgetBodyHeight = $widget.height() - $title.height() - $footer.height();
        $widgetError.height(Math.floor(widgetBodyHeight));
        bangSize = Math.floor(widgetBodyHeight / 2);
        $bang.css('font-size', Math.min(90, bangSize) + 'px');
        reloadSize = Math.min(13, Math.floor(widgetBodyHeight / 4));
        $reload.css('font-size', reloadSize);
        if (scope.widget.showWidgetErrors) {
          errorMessageLength = $widgetError.width() * widgetBodyHeight / 512;
          if (_.isObject(scope.widgetContext.dataSourceErrorMessage)) {
            if (scope.widgetContext.dataSourceErrorMessage.message != null) {
              scope.errorMessage = scope.widgetContext.dataSourceErrorMessage.message;
            }
          } else {
            scope.errorMessage = scope.widgetContext.dataSourceErrorMessage;
          }
          if (!_.isString(scope.errorMessage)) {
            scope.errorMessage = JSON.stringify(scope.errorMessage);
          }
          if (errorMessageLength < 30) {
            scope.shortErrorMessage = null;
          } else if (scope.errorMessage.length < errorMessageLength) {
            scope.shortErrorMessage = scope.errorMessage;
          } else {
            scope.shortErrorMessage = scope.errorMessage.substring(0, errorMessageLength - 3) + '...';
          }
        }
        topPadding = (widgetBodyHeight - $errorContainer.height()) / 3;
        return $errorContainer.css('margin-top', topPadding + 'px');
      };
      $widget.add('.title, .widget-footer').on('resize', _.throttle(function() {
        return scope.$apply(function() {
          return sizer();
        });
      }, 120, {
        leading: false,
        maxWait: 500
      }));
      sizer();
      timer = $timeout(sizer, 100);
      scope.$on('$destroy', function() {
        return $timeout.cancel(timer);
      });
    }
  };
}]);
