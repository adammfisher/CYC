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

/*
 * Service for initialization of Ace.
 * Will run after all vendor files are loaded (e.g. Ace is already defined)
 */
cyclotronServices.factory('aceService', function() {

    /* Configure ACE editor */
    ace.require('ace/ext/language_tools');
    ace.config.set('workerPath', '/js');

    return {}
})


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
cyclotronApp.controller('AnalyticsController', ['$scope', '$uibModal', 'analyticsService', function($scope, $uibModal, analyticsService) {
  $scope.smallLimit = 10;
  $scope.largeLimit = 20;
  $scope.uniqueVisitorLimit = $scope.smallLimit;
  $scope.browserLimit = $scope.smallLimit;
  $scope.topDashboardsLimit = $scope.smallLimit;
  $scope.dataSourcesLimit = $scope.smallLimit;
  $scope.dataSourceTypeLimit = $scope.smallLimit;
  $scope.widgetTypeLimit = $scope.smallLimit;
  $scope.toggleLimit = function(limit) {
    if ($scope[limit] === $scope.smallLimit) {
      return $scope[limit] = $scope.largeLimit;
    } else {
      return $scope[limit] = $scope.smallLimit;
    }
  };
  $scope.pageViewsOptions = {
    x_accessor: 'date',
    y_accessor: 'pageViews',
    mouseover: function(d, i) {
      return d.pageViews + ' page view' + (d.pageViews === 1 ? '' : 's') + ' | ' + moment(d.date).format('MMM Do HH:mm');
    }
  };
  $scope.visitsOptions = {
    x_accessor: 'date',
    y_accessor: 'visits',
    mouseover: function(d, i) {
      return d.visits + ' visit' + (d.visits === 1 ? '' : 's') + ' | ' + moment(d.date).format('MMM Do HH:mm');
    }
  };
  $scope.browserOptions = {
    data: {
      type: 'pie'
    }
  };
  $scope.widgetOptions = {
    data: {
      type: 'pie'
    }
  };
  $scope.dataSourceTypesOptions = {
    data: {
      type: 'pie'
    }
  };
  $scope.showVisitors = false;
  $scope.selectedTimespan = 'day';
  $scope.toggleVisitors = function() {
    return $scope.showVisitors = !$scope.showVisitors;
  };
  $scope.loadLifetimeData = function() {
    analyticsService.getTopDashboards().then(function(dashboards) {
      return $scope.topDashboards = dashboards;
    });
    return analyticsService.getStatistics().then(function(statistics) {
      return $scope.statistics = statistics;
    });
  };
  $scope.loadTimeseriesData = function() {
    var startDate, timeSpan;
    timeSpan = $scope.selectedTimespan.split('_');
    if (timeSpan.length === 1) {
      timeSpan.unshift(1);
    }
    startDate = moment().subtract(timeSpan[0], timeSpan[1]);
    analyticsService.getPageViewsOverTime(null, startDate).then(function(pageViews) {
      return $scope.pageViews = pageViews;
    });
    analyticsService.getVisitsOverTime(null, startDate).then(function(visits) {
      return $scope.visits = visits;
    });
    analyticsService.getUniqueVisitors(null, startDate).then(function(visitors) {
      $scope.uniqueVisitorCount = visitors.length;
      return $scope.uniqueVisitors = visitors;
    });
    analyticsService.getBrowsers(null, startDate).then(function(browsers) {
      var filteredBrowsers, otherPageViews, reducedBrowsers, sorted;
      $scope.browsers = browsers;
      sorted = _.sortBy(browsers, 'pageViews');
      filteredBrowsers = _.take(browsers, 6);
      otherPageViews = _.reduce(_.drop(browsers, 6), (function(total, browser) {
        return total + browser.pageViews;
      }), 0);
      filteredBrowsers.push({
        nameVersion: 'Other',
        pageViews: otherPageViews
      });
      $scope.browserOptions.data.keys = {
        value: _.pluck(filteredBrowsers, 'nameVersion')
      };
      reducedBrowsers = _.reduce(filteredBrowsers, function(result, browser) {
        result[browser.nameVersion] = browser.pageViews;
        return result;
      }, {});
      return $scope.browsersPie = [reducedBrowsers];
    });
    analyticsService.getDataSourcesByType(null, startDate).then(function(dataSourcesByType) {
      var reducedTypes;
      $scope.dataSourcesByType = dataSourcesByType;
      $scope.dataSourceTypesOptions.data.keys = {
        value: _.pluck(dataSourcesByType, 'dataSourceType')
      };
      reducedTypes = _.reduce(dataSourcesByType, function(result, type) {
        result[type.dataSourceType] = type.count;
        return result;
      }, {});
      return $scope.dataSourcesPie = [reducedTypes];
    });
    analyticsService.getWidgets(null, startDate).then(function(widgets) {
      var reducedWidgets;
      widgets = _.reject(widgets, function(widget) {
        return _.isEmpty(widget.widget);
      });
      $scope.widgets = widgets;
      $scope.widgetOptions.data.keys = {
        value: _.pluck(widgets, 'widget')
      };
      reducedWidgets = _.reduce(widgets, function(result, widget) {
        result[widget.widget] = widget.widgetViews;
        return result;
      }, {});
      return $scope.widgetsPie = [reducedWidgets];
    });
    return analyticsService.getDataSourcesByName(null, startDate).then(function(dataSources) {
      return $scope.dataSources = dataSources;
    });
  };
  $scope.loadLifetimeData();
  return $scope.$watch('selectedTimespan', function(timespan) {
    return $scope.loadTimeseriesData();
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
cyclotronApp.controller('DashboardAnalyticsController', ['$scope', '$stateParams', '$uibModal', 'analyticsService', 'dashboardService', function($scope, $stateParams, $uibModal, analyticsService, dashboardService) {
  $scope.dashboardName = $stateParams.dashboardName;
  $scope.pageViewsOptions = {
    x_accessor: 'date',
    y_accessor: 'pageViews',
    mouseover: function(d, i) {
      return d.pageViews + ' page view' + (d.pageViews === 1 ? '' : 's') + ' | ' + moment(d.date).format('MMM Do HH:mm');
    }
  };
  $scope.visitsOptions = {
    x_accessor: 'date',
    y_accessor: 'visits',
    mouseover: function(d, i) {
      return d.visits + ' visit' + (d.visits === 1 ? '' : 's') + ' | ' + moment(d.date).format('MMM Do HH:mm');
    }
  };
  $scope.browserOptions = {
    data: {
      type: 'pie'
    }
  };
  $scope.widgetOptions = {
    data: {
      type: 'pie'
    }
  };
  $scope.viewsPerPageOptions = {
    data: {
      type: 'bar',
      names: {
        pageViews: 'Page Views'
      },
      keys: {
        value: ['pageViews']
      }
    },
    axis: {
      x: {
        type: 'category'
      }
    }
  };
  $scope.showVisitors = false;
  $scope.selectedTimespan = 'day';
  $scope.toggleVisitors = function() {
    return $scope.showVisitors = !$scope.showVisitors;
  };
  $scope.loadTimeseriesData = function() {
    var startDate, timeSpan;
    if (!($scope.dashboard.visits > 0)) {
      return;
    }
    timeSpan = $scope.selectedTimespan.split('_');
    if (timeSpan.length === 1) {
      timeSpan.unshift(1);
    }
    startDate = moment().subtract(timeSpan[0], timeSpan[1]);
    analyticsService.getUniqueVisitors($scope.dashboardId, startDate).then(function(visitors) {
      $scope.uniqueVisitorCount = visitors.length;
      return $scope.uniqueVisitors = visitors;
    });
    analyticsService.getBrowsers($scope.dashboardId, startDate).then(function(browsers) {
      var reducedBrowsers;
      $scope.browserOptions.data.keys = {
        value: _.pluck(browsers, 'nameVersion')
      };
      reducedBrowsers = _.reduce(browsers, function(result, browser) {
        result[browser.nameVersion] = browser.pageViews;
        return result;
      }, {});
      return $scope.browsers = [reducedBrowsers];
    });
    analyticsService.getWidgets($scope.dashboardId, startDate).then(function(widgets) {
      var reducedWidgets;
      $scope.widgetOptions.data.keys = {
        value: _.pluck(widgets, 'widget')
      };
      reducedWidgets = _.reduce(widgets, function(result, widget) {
        result[widget.widget] = widget.widgetViews;
        return result;
      }, {});
      return $scope.widgets = [reducedWidgets];
    });
    analyticsService.getDataSourcesByName($scope.dashboardId, startDate).then(function(dataSources) {
      return $scope.dataSources = dataSources;
    });
    analyticsService.getPageViewsPerPage($scope.dashboardId, startDate).then(function(viewsPerPage) {
      var categories;
      categories = [];
      _.each(viewsPerPage, function(page) {
        return categories.push('Page ' + (page.page + 1));
      });
      $scope.viewsPerPage = viewsPerPage;
      return $scope.viewsPerPageOptions.axis.x.categories = categories;
    });
    analyticsService.getPageViewsOverTime($scope.dashboardId, startDate).then(function(pageViews) {
      return $scope.pageViews = pageViews;
    });
    return analyticsService.getVisitsOverTime($scope.dashboardId, startDate).then(function(visits) {
      return $scope.visits = visits;
    });
  };
  $scope.initialize = function() {
    var q;
    q = dashboardService.getDashboard($scope.dashboardName);
    q.then(function(dashboard) {
      var q2;
      $scope.dashboard = dashboard;
      $scope.dashboardId = dashboard._id;
      $scope.createdDate = '?';
      $scope.lastModifiedDate = moment(dashboard.date).format('MM/DD HH:mm:ss');
      $scope.longModifiedDate = moment(dashboard.date).format('MM/DD/YYYY HH:mm:ss');
      q2 = dashboardService.getRevision(dashboard.name, 1);
      return q2.then(function(rev) {
        $scope.rev1 = rev;
        $scope.createdDate = moment(rev.date).format('MM/DD HH:mm:ss');
        $scope.longCreatedDate = moment(rev.date).format('MM/DD/YYYY HH:mm:ss');
        return $scope.$watch('selectedTimespan', function(timespan) {
          return $scope.loadTimeseriesData();
        });
      });
    });
    return q["catch"](function(error) {
      switch (error.status) {
        case 401:
          $scope.login(true).then(function() {
            return $scope.initialize();
          });
          break;
        case 403:
          $scope.dashboardEditors = error.data.data.editors;
          $scope.dashboardName = $scope.dashboardName;
          return $uibModal.open({
            templateUrl: '/partials/viewPermissionDenied.html',
            scope: $scope,
            controller: 'GenericErrorModalController',
            backdrop: 'static',
            keyboard: false
          });
        case 404:
          return $uibModal.open({
            templateUrl: '/partials/404.html',
            scope: $scope,
            controller: 'GenericErrorModalController',
            backdrop: 'static',
            keyboard: false
          });
        default:
          return $uibModal.open({
            templateUrl: '/partials/500.html',
            scope: $scope,
            controller: 'GenericErrorModalController',
            backdrop: 'static',
            keyboard: false
          });
      }
    });
  };
  return $scope.initialize();
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
cyclotronApp.controller('DashboardHistoryController', ['$scope', '$stateParams', '$uibModal', 'dashboardService', function($scope, $stateParams, $uibModal, dashboardService) {
  $scope.dashboardName = $stateParams.dashboardName;
  $scope.itemsPerPage = 25;
  $scope.currentPage = 1;
  dashboardService.getDashboard($scope.dashboardName).then(function(dashboard) {
    return $scope.dashboard = dashboard;
  });
  dashboardService.getRevisions($scope.dashboardName).then(function(revisions) {
    $scope.revisions = revisions;
    return $scope.revisionsCount = revisions.length;
  });
  return $scope.diffWithLatest = function(rev) {
    var modalInstance;
    return modalInstance = $uibModal.open({
      templateUrl: '/partials/revisionDiff.html',
      size: 'lg',
      scope: $scope,
      controller: [
        '$scope', '$sce', 'rev', function($scope, $sce, rev) {
          $scope.rev1 = rev - 1;
          $scope.rev2 = rev;
          $scope.previous = function() {
            $scope.rev2 = $scope.rev1;
            return $scope.rev1 = $scope.rev1 - 1;
          };
          $scope.next = function() {
            $scope.rev1 = $scope.rev2;
            return $scope.rev2 = $scope.rev2 + 1;
          };
          $scope.updateDiff = function() {
            return dashboardService.getRevisionDiff($scope.dashboardName, $scope.rev1, $scope.rev2).then(function(diff) {
              return $scope.diff = $sce.trustAsHtml(diff);
            });
          };
          $scope.updateDiff();
          return $scope.$watch('rev1 + rev2', function() {
            return $scope.updateDiff();
          });
        }
      ],
      resolve: {
        rev: function() {
          return rev;
        }
      }
    });
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
cyclotronApp.controller('DataSourceEditorController', ['$scope', '$state', '$stateParams', 'configService', 'dashboardService', function($scope, $state, $stateParams, configService, dashboardService) {
  $scope.dashboardProperties = configService.dashboard.properties;
  $scope.allDataSources = configService.dashboard.properties.dataSources.options;
  $scope.$watch('editor.selectedItemIndex', function() {
    $scope.dataSourceIndex = $scope.editor.selectedItemIndex;
    return $scope.dataSource = $scope.editor.selectedItem;
  });
  $scope.combinedDataSourceProperties = function(dataSource) {
    var general, specific;
    general = _.omit(configService.dashboard.properties.dataSources.properties, 'type');
    if ((dataSource.type != null) && ($scope.allDataSources[dataSource.type] != null)) {
      specific = $scope.allDataSources[dataSource.type].properties;
      return _.defaults(specific, general);
    } else {
      return {};
    }
  };
  $scope.dataSourceMessage = function() {
    var ref;
    return (ref = $scope.allDataSources[$scope.dataSource.type]) != null ? ref.message : void 0;
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
cyclotronApp.controller('DeleteDashboardController', ['$scope', '$uibModalInstance', 'dashboardName', function($scope, $uibModalInstance, dashboardName) {
  return $scope.dashboardName = dashboardName;
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
cyclotronApp.controller('EncryptStringController', ['$scope', '$uibModalInstance', 'cryptoService', 'configService', function($scope, $uibModalInstance, cryptoService, configService) {
  $scope.fields = {};
  $scope.encrypt = function() {
    if (_.isEmpty($scope.fields.value)) {
      return;
    }
    return cryptoService.encrypt($scope.fields.value).then(function(result) {
      return $scope.fields.encryptedValue = result;
    });
  };
  return $scope.cancel = function() {
    return $uibModalInstance.dismiss('cancel');
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
cyclotronApp.controller('ExportController', ['$scope', '$state', '$stateParams', '$location', '$timeout', '$uibModal', 'configService', 'dashboardService', 'exportService', function($scope, $state, $stateParams, $location, $timeout, $uibModal, configService, dashboardService, exportService) {
  var q, viewPermissionDenied;
  $scope.exportFormats = configService.exportFormats;
  $scope.exportFormat = _.first($scope.exportFormats);
  $scope.exporting = false;
  $scope.parameters = $location.search();
  $scope.$watch('parameters', function(parameters, oldParameters) {
    var deletedKeys;
    deletedKeys = _.difference(_.keys(oldParameters), _.keys(parameters));
    _.each(deletedKeys, function(key) {
      return $location.search(key, null);
    });
    return _.each(parameters, function(value, key) {
      return $location.search(key, value);
    });
  }, true);
  $scope["export"] = function() {
    var exportParameters;
    $scope.exporting = true;
    exportParameters = _.clone($location.search());
    exportParameters.browsercheck = false;
    exportParameters.exporting = true;
    return exportService.exportAsync($scope.dashboardName, $scope.exportFormat.value, exportParameters, function(result) {
      return $scope.checkStatus(result.statusUrl);
    });
  };
  $scope.checkStatus = function(statusUrl) {
    return exportService.getStatus(statusUrl, function(status) {
      status.humanDuration = moment.duration(status.duration).humanize();
      $scope.exportStatus = status;
      if (status.status === 'running') {
        return $timeout(_.wrap(statusUrl, $scope.checkStatus), 2500, true);
      } else {
        return $scope.exporting = false;
      }
    });
  };
  if (_.isEmpty($stateParams.dashboardName)) {
    $scope.dashboardName = "";
  } else {
    q = dashboardService.getDashboard($stateParams.dashboardName);
    q.then(function(dashboardWrapper) {
      return $scope.dashboardName = $stateParams.dashboardName;
    });
    q["catch"](function(error) {
      switch (error.status) {
        case 401:
          return $scope.login(true).then(function() {
            return viewPermissionDenied();
          });
        case 403:
          return viewPermissionDenied();
      }
    });
  }
  return viewPermissionDenied = function() {
    var modalInstance;
    return modalInstance = $uibModal.open({
      templateUrl: '/partials/viewPermissionDenied.html',
      scope: $scope,
      controller: 'GenericErrorModalController',
      backdrop: 'static',
      keyboard: false
    });
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
cyclotronApp.controller('GenericErrorModalController', ['$scope', '$uibModalInstance', '$state', function($scope, $uibModalInstance, $state) {
  return $scope.goHome = function() {
    $uibModalInstance.dismiss();
    return $state.go('home');
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
cyclotronApp.controller('GuiEditorController', ['$scope', '$state', '$stateParams', '$location', '$hotkey', '$uibModal', '$window', 'configService', 'userService', 'dashboardService', 'tagService', 'aceService', function($scope, $state, $stateParams, $location, $hotkey, $uibModal, $window, configService, userService, dashboardService, tagService, aceService) {
  var initialize, saveHandler;
  $scope.dashboardProperties = configService.dashboard.properties;
  $scope.themes = configService.themes;
  $scope.widgets = configService.widgets;
  $scope.ldapSearch = {
    editors: {
      results: [],
      searchCount: 0,
      currentId: 0
    },
    viewers: {
      results: [],
      searchCount: 0,
      currentId: 0
    }
  };
  $scope.emptyObject = {};
  $scope.dashboardExcludes = ['name', 'pages', 'dataSources', 'scripts', 'parameters', 'styles'];
  $scope.editor = {
    initialized: false,
    isNew: true,
    isDirty: false,
    hasEditPermission: true,
    dashboard: dashboardService.newDashboard(),
    dashboardWrapper: {
      tags: []
    },
    cleanDashboardWrapper: null,
    showRevisions: false
  };
  $scope.isValidDashboardName = function() {
    if (_.isUndefined($scope.editor.dashboard.name)) {
      return false;
    }
    return /^[A-Za-z0-9-_ ]*$/.test($scope.editor.dashboardName);
  };
  $scope.isLatestRevision = function() {
    return $scope.editor.latestRevision === $scope.editor.revision;
  };
  $scope.canPreview = function() {
    return !$scope.editor.isNew && !$scope.editor.dashboardWrapper.deleted;
  };
  $scope.isDirty = function() {
    return $scope.editor.isDirty || $scope.editor.latestRevisionDeleted;
  };
  $scope.canSave = function() {
    return $scope.editor.initialized && $scope.editor.hasEditPermission && $scope.isDirty() && !$scope.isSaving && !$scope.hasDuplicateDataSourceName();
  };
  $scope.canExport = function() {
    return !$scope.editor.isNew && $scope.isLatestRevision();
  };
  $scope.canDelete = function() {
    if ($scope.editor.isNew || $scope.editor.latestRevisionDeleted) {
      return false;
    }
    return $scope.editor.hasEditPermission && $scope.isLatestRevision();
  };
  $scope.canPush = function() {
    if (!userService.isLoggedIn()) {
      return false;
    }
    if ($scope.editor.isNew || $scope.editor.isDirty) {
      return false;
    }
    if ($scope.editor.dashboardWrapper.deleted) {
      return false;
    }
    return true;
  };
  $scope.canEncrypt = function() {
    return userService.isLoggedIn() && $scope.editor.initialized;
  };
  $scope.canClone = function() {
    return !$scope.editor.isNew && userService.isLoggedIn();
  };
  $scope.canJsonEdit = function() {
    return !($state.current.data.editJson === false);
  };
  $scope.hasDuplicateDataSourceName = function() {
    var dataSources, groups;
    dataSources = $scope.editor.dashboard.dataSources;
    if (dataSources == null) {
      return false;
    }
    groups = _.groupBy(dataSources, function(dataSource) {
      var ref;
      return (ref = dataSource.name) != null ? ref.toLowerCase() : void 0;
    });
    return _.any(groups, function(values, key) {
      return values.length > 1;
    });
  };
  $scope.isDuplicateDataSourceName = function(dataSource) {
    var duplicates, name, ref;
    name = (ref = dataSource.name) != null ? ref.toLowerCase() : void 0;
    duplicates = _.filter($scope.editor.dashboard.dataSources, function(ds) {
      var ref1;
      return ((ref1 = ds.name) != null ? ref1.toLowerCase() : void 0) === name;
    });
    return duplicates.length > 1;
  };
  $scope.dashboardUrl = function(preview) {
    var params, url;
    if (preview == null) {
      preview = false;
    }
    params = [];
    url = '/' + $scope.editor.dashboard.name;
    if (preview === true) {
      params.push('live=true');
    }
    if (!$scope.isLatestRevision()) {
      params.push('rev=' + $scope.editor.revision);
    }
    if (params.length > 0) {
      url = url + '?' + params.join('&');
    }
    return url;
  };
  $scope.previewButtonText = function() {
    if ($scope.isLatestRevision()) {
      return 'Preview';
    } else {
      return 'Preview Revision #' + $scope.editor.revision;
    }
  };
  $scope.getVisitCategory = function() {
    return dashboardService.getVisitCategory($scope.editor.dashboardWrapper);
  };
  $scope.loadDashboard = function(dashboardWrapper) {
    var ref;
    $scope.editor.dashboardWrapper = dashboardWrapper;
    $scope.editor.dashboard = dashboardWrapper.dashboard;
    $scope.editor.revisionDate = moment(dashboardWrapper.date).format("MM/DD HH:mm:ss");
    $scope.editor.isDirty = false;
    $scope.editor.isNew = false;
    $scope.editor.hasEditPermission = userService.hasEditPermission(dashboardWrapper);
    $scope.editor.likeCount = (ref = dashboardWrapper.likes) != null ? ref.length : void 0;
    $scope.ldapSearch.editors.results = dashboardWrapper.editors;
    return $scope.ldapSearch.viewers.results = dashboardWrapper.viewers;
  };
  $scope.switchRevision = function() {
    var q;
    if ($scope.editor.revision === $scope.editor.latestRevision) {
      $scope.loadDashboard($scope.editor.cleanDashboardWrapper);
      return $location.search('rev', null);
    } else {
      q = dashboardService.getRevision($stateParams.dashboardName, $scope.editor.revision);
      return q.then(function(dashboardWrapper) {
        $scope.loadDashboard(dashboardWrapper);
        return $location.search('rev', $scope.editor.revision);
      });
    }
  };
  $scope.combinedDataSourceProperties = function(dataSource) {
    var allDataSources, general, specific;
    general = _.omit(configService.dashboard.properties.dataSources.properties, 'type');
    allDataSources = configService.dashboard.properties.dataSources.options;
    if ((dataSource.type != null) && (allDataSources[dataSource.type] != null)) {
      specific = allDataSources[dataSource.type].properties;
      return _.defaults(specific, general);
    } else {
      return $scope.emptyObject;
    }
  };
  $scope.combinedWidgetProperties = function(widget) {
    var general, specific;
    general = _.omit(configService.dashboard.properties.pages.properties.widgets.properties, 'widget');
    if ((widget.widget != null) && widget.widget.length > 0) {
      specific = configService.widgets[widget.widget].properties;
      return _.defaults(specific, general);
    } else {
      return $scope.emptyObject;
    }
  };
  $scope.getDataSourceName = function(item, index) {
    var ref;
    if (((ref = item.name) != null ? ref.length : void 0) > 0) {
      return _.titleCase(item.type) + ': ' + item.name;
    } else {
      return 'Data Source ' + index;
    }
  };
  $scope.getPageName = dashboardService.getPageName;
  $scope.getWidgetName = dashboardService.getWidgetName;
  $scope.getParameterName = function(item, index) {
    var ref;
    if (((ref = item.name) != null ? ref.length : void 0) > 0) {
      return item.name;
    } else {
      return 'Parameter ' + (index + 1);
    }
  };
  $scope.getScriptOrStyleName = function(item, index, label) {
    var name, ref, ref1;
    if (((ref = item.name) != null ? ref.length : void 0) > 0) {
      return item.name;
    }
    if (item.path != null) {
      name = _.last(item.path.split('/'));
      if (name.length === 0) {
        name = item.path;
      }
    } else if (((ref1 = item.text) != null ? ref1.length : void 0) > 0) {
      name = item.text.substring(0, 32);
      if (item.text.length > 32) {
        name += '...';
      }
    } else {
      name = label + ' ' + (index + 1);
    }
    return name;
  };
  $scope.selectWidget = function() {
    var sample;
    sample = _.cloneDeep($scope.widgets[$scope.editor.selectedItem.widget].sample);
    if (sample != null) {
      if (_.isFunction(sample)) {
        return $scope.editor.selectedItem = _.defaults($scope.editor.selectedItem, sample());
      } else {
        return $scope.editor.selectedItem = _.defaults($scope.editor.selectedItem, sample);
      }
    }
  };
  $scope.goToSubState = function(state, item, index) {
    $scope.editor.currentEditor = state;
    $scope.editor.selectedItem = item;
    $scope.editor.selectedItemIndex = index;
    if (state === 'edit.page') {
      $scope.editor.selectedPageIndex = index;
    }
    return $state.go(state);
  };
  $scope.returnFromJsonEditor = function() {
    return $state.go($scope.editor.currentEditor);
  };
  $scope.moveRevisionLeft = function() {
    if ($scope.editor.revision === 1) {
      return;
    }
    $scope.editor.revision--;
    return $scope.switchRevision();
  };
  $scope.moveRevisionRight = function() {
    if ($scope.editor.revision === $scope.editor.latestRevision) {
      return;
    }
    $scope.editor.revision++;
    return $scope.switchRevision();
  };
  $scope.searchLdap = function(query, type) {
    var currentSearchId;
    if (!(query.length > 2)) {
      return;
    }
    currentSearchId = ++$scope.ldapSearch[type].searchCount;
    return userService.search(query).then(function(results) {
      if (currentSearchId < $scope.ldapSearch[type].currentId) {
        return;
      }
      results = _.map(results, function(result) {
        return {
          displayName: result.displayName,
          category: result.category,
          dn: result.dn,
          sAMAccountName: result.sAMAccountName,
          mail: result.mail
        };
      });
      _.each($scope.editor.dashboardWrapper[type], function(selectedEditorOrViewer) {
        _.remove(results, function(result) {
          return result.dn === selectedEditorOrViewer.dn;
        });
        return results.push(selectedEditorOrViewer);
      });
      $scope.ldapSearch[type].results = results;
      return $scope.ldapSearch[type].currentId = currentSearchId;
    });
  };
  $scope.clone = function() {
    if (!$scope.canClone()) {
      return;
    }
    $scope.editor.isNew = true;
    $scope.editor.isDirty = true;
    $scope.editor.hasEditPermission = true;
    $scope.editor.dashboard.description = 'Cloned from ' + $scope.editor.dashboard.name + ', revision ' + $scope.editor.dashboardWrapper.rev;
    $scope.editor.dashboardWrapper.deleted = false;
    $scope.editor.dashboardWrapper.rev = 1;
    $scope.editor.dashboard.name += ' CLONE';
    return alertify.log("Cloned Dashboard", 2500);
  };
  $scope.push = function() {
    var modalInstance;
    if (!$scope.canPush()) {
      return;
    }
    return modalInstance = $uibModal.open({
      templateUrl: '/partials/editor/pushDashboard.html',
      scope: $scope,
      controller: 'PushDashboardController'
    });
  };
  $scope.encrypt = function() {
    var modalInstance;
    if (!$scope.canEncrypt()) {
      return;
    }
    return modalInstance = $uibModal.open({
      templateUrl: '/partials/editor/encryptString.html',
      scope: $scope,
      controller: 'EncryptStringController'
    });
  };
  $scope["delete"] = function() {
    var modalInstance;
    if (!$scope.canDelete()) {
      return;
    }
    modalInstance = $uibModal.open({
      templateUrl: '/partials/editor/delete.html',
      controller: 'DeleteDashboardController',
      resolve: {
        dashboardName: function() {
          return $scope.editor.dashboardWrapper.name;
        }
      }
    });
    return modalInstance.result.then(function() {
      var q;
      q = dashboardService["delete"]($scope.editor.dashboardWrapper.name);
      return q.then(function(dashboardWrapper) {
        $scope.editor.dashboardWrapper = dashboardWrapper;
        $scope.editor.cleanDashboardWrapper = _.cloneDeep(dashboardWrapper);
        $scope.editor.latestRevision = dashboardWrapper.rev;
        $scope.editor.latestRevisionDeleted = true;
        return $scope.editor.isDirty = true;
      });
    });
  };
  $scope.save = function() {
    var dashboardName, dashboardToSave, e;
    if (!$scope.isDirty()) {
      return;
    }
    if (!$scope.isLoggedIn()) {
      return $scope.login(true).then(function() {
        $scope.editor.hasEditPermission = userService.hasEditPermission($scope.editor.dashboardWrapper);
        return $scope.save();
      });
    } else if ($scope.canSave()) {
      $scope.isSaving = true;
      try {
        if ($scope.editor.isNew) {
          if (($scope.editor.dashboard.name == null) || $scope.editor.dashboard.name === '') {
            alertify.error('Dashboard Name property is missing', 10000);
            $scope.isSaving = false;
            return;
          }
          dashboardName = _.slugify($scope.editor.dashboard.name);
          $scope.editor.dashboard.name = dashboardName;
          $scope.editor.dashboardWrapper.name = dashboardName;
          $scope.editor.dashboardWrapper.dashboard = $scope.editor.dashboard;
          return dashboardService.save($scope.editor.dashboardWrapper).then(function() {
            $state.go('edit.details', {
              dashboardName: dashboardName
            });
            $scope.editor.isNew = false;
            return $scope.editor.hasEditPermission = userService.hasEditPermission($scope.editor.dashboardWrapper);
          })["catch"](function(e) {
            return $scope.isSaving = false;
          });
        } else {
          dashboardToSave = _.cloneDeep($scope.editor.dashboardWrapper);
          return dashboardService.update(dashboardToSave).then(function() {
            $scope.editor.latestRevision = $scope.editor.revision = ++dashboardToSave.rev;
            $scope.editor.latestRevisionDeleted = false;
            $scope.editor.dashboardWrapper.rev = $scope.editor.latestRevision;
            $scope.editor.dashboardWrapper.deleted = false;
            $scope.editor.dashboardWrapper.lastUpdatedBy = userService.currentUser();
            $scope.editor.cleanDashboardWrapper = dashboardToSave;
            $scope.editor.cleanDashboardWrapper.rev = $scope.editor.latestRevision;
            $scope.editor.cleanDashboardWrapper.deleted = false;
            $scope.editor.cleanDashboardWrapper.lastUpdatedBy = userService.currentUser();
            $scope.editor.hasEditPermission = userService.hasEditPermission($scope.editor.dashboardWrapper);
            $scope.editor.isDirty = false;
            $scope.isSaving = false;
            return $location.search('rev', null);
          })["catch"](function(e) {
            return $scope.isSaving = false;
          });
        }
      } catch (error1) {
        e = error1;
        $scope.isSaving = false;
        return alertify.error(e.toString(), 10000);
      }
    }
  };
  $scope.newPage = function() {
    return dashboardService.addPage($scope.editor.dashboard);
  };
  $scope.removePage = function(index) {
    return dashboardService.removePage($scope.editor.dashboard, index);
  };
  $scope.removeWidget = function(index) {
    return dashboardService.removeWidget($scope.editor.dashboard, index, $scope.editor.selectedPageIndex);
  };
  $scope.newDataSource = function(dataSourceName) {
    return dashboardService.addDataSource($scope.editor.dashboard, dataSourceName);
  };
  $scope.removeDataSource = function(index) {
    return dashboardService.removeDataSource($scope.editor.dashboard, index);
  };
  $scope.newParameter = function() {
    return dashboardService.addParameter($scope.editor.dashboard);
  };
  $scope.removeParameter = function(index) {
    return dashboardService.removeParameter($scope.editor.dashboard, index);
  };
  $scope.newScript = function() {
    return dashboardService.addScript($scope.editor.dashboard);
  };
  $scope.removeScript = function(index) {
    return dashboardService.removeScript($scope.editor.dashboard, index);
  };
  $scope.newStyle = function() {
    return dashboardService.addStyle($scope.editor.dashboard);
  };
  $scope.removeStyle = function(index) {
    return dashboardService.removeStyle($scope.editor.dashboard, index);
  };
  initialize = function() {
    var q;
    if (_.isEmpty($stateParams.dashboardName)) {
      $scope.goToSubState('edit.details', $scope.editor.dashboard, 0);
      return $scope.editor.initialized = true;
    } else {
      q = dashboardService.getDashboard($stateParams.dashboardName);
      q.then(function(dashboardWrapper) {
        $scope.editor.latestRevision = dashboardWrapper.rev;
        $scope.editor.latestRevisionDeleted = dashboardWrapper.deleted;
        $scope.editor.cleanDashboardWrapper = _.cloneDeep(dashboardWrapper);
        if ($location.search().rev != null) {
          $scope.editor.revision = $location.search().rev;
          $scope.editor.showRevisions = true;
          $scope.switchRevision();
        } else {
          $scope.loadDashboard(dashboardWrapper);
          $scope.editor.revision = dashboardWrapper.rev;
        }
        return $scope.editor.initialized = true;
      });
      return q["catch"](function(error) {
        var modalInstance;
        $scope.editor.isDirty = false;
        switch (error.status) {
          case 401:
            return $scope.login(true).then(function() {
              return initialize();
            });
          case 403:
            $scope.dashboardEditors = error.data.data.editors;
            $scope.dashboardName = $stateParams.dashboardName;
            return modalInstance = $uibModal.open({
              templateUrl: '/partials/viewPermissionDenied.html',
              scope: $scope,
              controller: 'GenericErrorModalController',
              backdrop: 'static',
              keyboard: false
            });
        }
      });
    }
  };
  initialize();
  $scope.$watch('editor.dashboardWrapper', function(modified) {
    if (modified == null) {
      return;
    }
    return $scope.editor.isDirty = !angular.equals($scope.editor.cleanDashboardWrapper, modified);
  }, true);
  $scope.$watch('isLoggedIn()', function() {
    var ref;
    return $scope.editor.hasEditPermission = userService.hasEditPermission((ref = $scope.editor) != null ? ref.dashboardWrapper : void 0);
  });
  tagService.getTags(function(tags) {
    return $scope.allTags = tags;
  });
  $('.tagEditor').on("change", function(e) {
    return $scope.editor.isDirty = true;
  });
  $scope.$on('$stateChangeSuccess', function() {
    if ($scope.editor.revision == null) {
      return;
    }
    if ($scope.editor.revision === $scope.editor.latestRevision) {
      return $location.search('rev', null);
    } else {
      return $location.search('rev', $scope.editor.revision);
    }
  });
  saveHandler = function(event) {
    event.preventDefault();
    return $scope.save();
  };
  $hotkey.bind('Command + S', saveHandler);
  $hotkey.bind('Ctrl + S', saveHandler);
  $scope.$on('$stateChangeStart', function(event, toState) {
    var answer;
    if (!$scope.editor.isDirty || toState.name.substring(0, 5) === 'edit.') {
      return;
    }
    answer = confirm('You have unsaved changes, are you sure you want to leave.');
    if (!answer) {
      return event.preventDefault();
    }
  });
  $window.onbeforeunload = function() {
    if ($scope.editor.isDirty) {
      return 'You have unsaved changes, are you sure you want to leave.';
    }
  };
  $scope.$on('$destroy', function() {
    return $window.onbeforeunload = void 0;
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
cyclotronApp.controller('HelpController', ['$scope', '$location', 'configService', function($scope, $location, configService) {
  var q;
  $scope.config = configService;
  $scope.menu = configService.help;
  $scope.selectItem = function(item) {
    $scope.selectedItem = item;
    return $location.search('q', item.name);
  };
  $scope.feelingLucky = function() {
    return $scope.$broadcast('feelingLucky');
  };
  $scope.findItem = function(name) {
    return $scope.$broadcast('findItem', {
      name: name
    });
  };
  q = $location.search().q;
  if (q != null) {
    return $scope.q = q;
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
cyclotronApp.controller('HomeController', ['$scope', '$location', '$uibModal', 'configService', 'dashboardService', 'tagService', 'userService', function($scope, $location, $uibModal, configService, dashboardService, tagService, userService) {
  var q, ref, ref1, s, toggleLikeHelper;
  $scope.cyclotronVersion = configService.version;
  if ($scope.changelogLink == null) {
    $scope.changelogLink = configService.changelogLink;
  }
  $scope.showSplash = true;
  $scope.loading = false;
  $scope.sortByField = 'name';
  $scope.sortByReverse = false;
  $scope.search = {
    allTags: [],
    allHints: [],
    hints: [],
    query: []
  };
  $scope.currentPage = 1;
  $scope.itemsPerPage = 25;
  $scope.isTag = function(hint) {
    return _.contains($scope.search.allTags, hint);
  };
  $scope.isAdvanced = function(hint) {
    return _.contains($scope.search.advanced, hint);
  };
  $scope.selectTag = function(tag) {
    return $scope.search.query = _.union($scope.search.query, [tag]);
  };
  $scope.getSearchHints = function() {
    return tagService.getSearchHints(function(searchHints) {
      $scope.search.allHints = searchHints;
      return $scope.getAdvancedSearchHints();
    });
  };
  $scope.getAdvancedSearchHints = function() {
    var username;
    $scope.search.advanced = _.sortBy(['is:deleted', 'is:liked', 'include:deleted']);
    if (userService.authEnabled && userService.isLoggedIn()) {
      username = userService.currentUser().sAMAccountName;
      $scope.search.advanced.push('likedby:' + username);
      $scope.search.advanced.push('lastupdatedby:' + username);
    }
    return $scope.search.hints = $scope.search.advanced.concat($scope.search.allHints);
  };
  $scope.canEdit = function(dashboard) {
    if (!$scope.isLoggedIn()) {
      return true;
    }
    if (dashboard != null) {
      return dashboard._canView;
    } else {
      return true;
    }
  };
  $scope.canDelete = function(dashboard) {
    if (!$scope.isLoggedIn()) {
      return false;
    }
    if (dashboard != null) {
      return dashboard._canEdit;
    } else {
      return true;
    }
  };
  $scope.loginAlert = function() {
    return alertify.error('Please login to enable', 2500);
  };
  $scope.loadDashboards = function() {
    var p;
    $scope.dashboards = null;
    if (!($scope.search.query.length > 0)) {
      return;
    }
    $scope.showSplash = false;
    $scope.loading = true;
    p = dashboardService.getDashboards($scope.search.query.join(','));
    p.then(function(dashboards) {
      $scope.dashboards = dashboards;
      $scope.augmentDashboards();
      $scope.resultsCount = $scope.dashboards.length;
      return $scope.loading = false;
    });
    return p["catch"](function(response) {
      if (response.status === 500) {
        return $uibModal.open({
          templateUrl: '/partials/500.html',
          scope: $scope,
          controller: 'GenericErrorModalController',
          backdrop: 'static',
          keyboard: false
        });
      }
    });
  };
  $scope.augmentDashboards = function() {
    return _.each($scope.dashboards, function(dashboard) {
      dashboard._canEdit = userService.hasEditPermission(dashboard);
      dashboard._canView = userService.hasViewPermission(dashboard);
      dashboard._liked = userService.likesDashboard(dashboard);
      dashboard.likeCount = dashboard.likes.length;
      dashboard.visitCategory = dashboardService.getVisitCategory(dashboard);
    });
  };
  toggleLikeHelper = function(dashboard) {
    if (dashboard._liked) {
      return dashboardService.unlike(dashboard).then(function() {
        dashboard._liked = false;
        return dashboard.likeCount--;
      });
    } else {
      return dashboardService.like(dashboard).then(function() {
        dashboard._liked = true;
        return dashboard.likeCount++;
      });
    }
  };
  $scope.toggleLike = function(dashboard) {
    if (userService.authEnabled && !userService.isLoggedIn()) {
      return $scope.login(true).then(function() {
        return toggleLikeHelper(dashboard);
      });
    } else {
      return toggleLikeHelper(dashboard);
    }
  };
  $scope["delete"] = function(dashboardName) {
    var modalInstance;
    modalInstance = $uibModal.open({
      templateUrl: '/partials/editor/delete.html',
      controller: 'DeleteDashboardController',
      resolve: {
        dashboardName: function() {
          return dashboardName;
        }
      }
    });
    return modalInstance.result.then(function() {
      var q;
      q = dashboardService["delete"](dashboardName);
      return q.then(function() {
        var tagIndex;
        _.remove($scope.dashboards, {
          name: dashboardName
        });
        tagIndex = $scope.searchOptions.tags.indexOf(dashboardName);
        if (tagIndex > -1) {
          return $scope.searchOptions.tags.splice(tagIndex, 1);
        }
      });
    });
  };
  $scope.loadQueryString = function(q) {
    return $scope.search.query = _.isEmpty(q) ? [] : _.uniq(q.split(','));
  };
  $scope.tagSorter = function(dashboard) {
    if (_.isEmpty(dashboard.tags)) {
      return '~';
    } else {
      return dashboard.tags.join('.');
    }
  };
  $scope.sortBy = function(field, descending) {
    if ($scope.sortByField === field) {
      $scope.sortByReverse = !$scope.sortByReverse;
    } else {
      $scope.sortByField = field;
      $scope.sortByReverse = descending;
    }
    if ($scope.sortByReverse === true) {
      field = '-' + field;
    }
    return $location.search('s', field);
  };
  $scope.setPageSize = function(size) {
    return $scope.itemsPerPage = size;
  };
  q = (ref = $location.search()) != null ? ref.q : void 0;
  if ((q != null) && q.length > 0) {
    $scope.loadQueryString(q);
    $scope.loadDashboards();
  }
  s = (ref1 = $location.search()) != null ? ref1.s : void 0;
  if ((s != null) && s.length > 0) {
    if (s.indexOf('-') === 0) {
      $scope.sortByReverse = true;
      s = s.substr(1);
    } else {
      $scope.sortByReverse = false;
    }
    $scope.sortByField = s;
  }
  tagService.getTags(function(tags) {
    $scope.search.allTags = tags;
    if ((q != null) && q.length > 0) {
      $scope.loadQueryString(q);
    }
    return $scope.$watch('search.query', function(query, oldQuery) {
      if (!_.isArray(query)) {
        return;
      }
      if (_.isEqual(query, oldQuery)) {
        return;
      }
      if (_.isEmpty(query)) {
        $location.search('q', null);
        $scope.showSplash = true;
      } else {
        $location.search('q', query.join(','));
      }
      return $scope.loadDashboards();
    });
  });
  $scope.getSearchHints();
  $scope.$watch('isLoggedIn()', function() {
    $scope.augmentDashboards();
    return $scope.getAdvancedSearchHints();
  });
  return $scope.$watch((function() {
    return $location.search();
  }), function(newSearch, oldSearch) {
    if (_.isEqual(newSearch.q, oldSearch, q)) {
      return;
    }
    return $scope.loadQueryString(newSearch.q);
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
cyclotronApp.controller('PageEditorController', ['$scope', '$stateParams', 'configService', 'dashboardService', function($scope, $stateParams, configService, dashboardService) {
  $scope.pageExcludes = ['widgets'];
  $scope.$watch('editor.selectedItemIndex', function(pageIndex) {
    return $scope.editor.selectedPage = $scope.editor.selectedItem;
  });
  $scope.newWidget = function(widgetName, pageIndex) {
    return dashboardService.addWidget($scope.editor.dashboard, widgetName, pageIndex);
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
cyclotronApp.controller('PushDashboardController', ['$scope', '$uibModalInstance', '$q', '$http', '$timeout', 'analyticsService', 'configService', 'dashboardService', 'focusService', 'userService', function($scope, $uibModalInstance, $q, $http, $timeout, analyticsService, configService, dashboardService, focusService, userService) {
  $scope.environmentsForPush = _.reject(configService.cyclotronEnvironments, {
    canPush: false
  });
  $scope.fields = {};
  $scope.updateFocus = function() {
    return $timeout(function() {
      if (userService.cachedUsername != null) {
        $scope.fields.username = userService.cachedUsername;
        return focusService.focus('focusPassword', $scope);
      } else {
        return focusService.focus('focusUsername', $scope);
      }
    });
  };
  $scope.login = function() {
    var deferred, loginPromise, targetUrl;
    deferred = $q.defer();
    if (!$scope.fields.pushLocation.requiresAuth) {
      deferred.resolve(null);
    } else {
      targetUrl = new URI($scope.fields.pushLocation.serviceUrl).segment('/users/login').protocol('').toString();
      loginPromise = $http.post(targetUrl, {
        username: $scope.fields.username,
        password: $scope.fields.password
      });
      loginPromise.success(function(session) {
        $scope.fields.password = '';
        return deferred.resolve(session.key);
      });
      loginPromise.error(function(error) {
        $scope.fields.password = '';
        focusService.focus('focusPassword', $scope);
        if (_.isObject(error)) {
          alertify.error('Login Error: ' + error.name, 2500);
        } else {
          alertify.error('Login Error: ' + error.toString(), 2500);
        }
        return deferred.reject(error);
      });
    }
    return deferred.promise;
  };
  $scope.push = function() {
    var p;
    p = $scope.login();
    return p.then(function(sessionKey) {
      var q;
      q = dashboardService.pushToService($scope.editor.dashboardWrapper, $scope.fields.pushLocation.serviceUrl, sessionKey);
      q.then(function() {
        analyticsService.recordEvent('pushDashboard', {
          dashboardName: $scope.editor.dashboardWrapper.name,
          destination: $scope.fields.pushLocation.serviceUrl
        });
        alertify.log("Pushed Dashboard to " + $scope.fields.pushLocation.name, 2500);
        return $uibModalInstance.close();
      });
      return q["catch"](function(error) {
        return alertify.error('Error pushing Dashboard: ' + error, 2500);
      });
    });
  };
  return $scope.cancel = function() {
    return $uibModalInstance.dismiss('cancel');
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
cyclotronServices.factory('cryptoService', ['$http', '$q', 'configService', function($http, $q, configService) {
  return {
    encrypt: function(value) {
      var deferred, q;
      deferred = $q.defer();
      q = $http.post(configService.restServiceUrl + '/crypto/encrypt', {
        value: value
      });
      q.success(function(result) {
        return deferred.resolve('!{' + result + '}');
      });
      q.error(function(error) {
        alertify.error('Cannot connect to cyclotron-svc (encrypt)', 2500);
        return deferred.reject(error);
      });
      return deferred.promise;
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
cyclotronServices.factory('exportService', ['$http', 'configService', function($http, configService) {
  return {
    exportAsync: function(dashboardName, format, params, callback) {
      var paramStrings, uri;
      uri = configService.restServiceUrl + '/export/' + dashboardName + '/' + format;
      if ((params != null) && _.keys(params).length > 0) {
        paramStrings = _.map(_.pairs(params), function(pair) {
          return pair[0] + '=' + pair[1];
        });
        uri += '?' + paramStrings.join('&');
      }
      return $http.post(uri).success(function(result) {
        if (_.isFunction(callback)) {
          return callback(result);
        }
      });
    },
    getStatus: function(statusUrl, callback) {
      return $http.get(statusUrl).success(function(result) {
        if (_.isFunction(callback)) {
          return callback(result);
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
cyclotronServices.factory('tagService', ['$http', 'configService', function($http, configService) {
  return {
    getTags: function(callback) {
      var q;
      q = $http.get(configService.restServiceUrl + '/tags');
      q.success(function(tags) {
        if (_.isFunction(callback)) {
          return callback(tags);
        }
      });
      return q.error(function() {
        return alertify.error('Cannot connect to cyclotron-svc (getTags)', 2500);
      });
    },
    getSearchHints: function(callback) {
      var q;
      q = $http.get(configService.restServiceUrl + '/searchhints');
      q.success(function(searchhints) {
        if (_.isFunction(callback)) {
          return callback(searchhints);
        }
      });
      return q.error(function() {
        return alertify.error('Cannot connect to cyclotron-svc (getSearchHints)', 2500);
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
cyclotronDirectives.directive('c3chart', function() {
  return {
    restrict: 'EAC',
    scope: {
      data: '=',
      options: '='
    },
    link: function(scope, element) {
      var $element, redraw;
      $element = $(element);
      scope.width = $element.width();
      if (_.isEmpty($element.prop('id'))) {
        scope.id = 'c3-' + uuid.v4();
        $element.prop('id', scope.id);
      }
      redraw = function() {
        var options;
        if (!((scope.data != null) && scope.data.length > 0)) {
          return;
        }
        options = {
          bindto: '#' + scope.id,
          data: {
            json: scope.data
          },
          size: {
            height: 200
          }
        };
        _.merge(options, scope.options);
        return c3.generate(options);
      };
      scope.$watch('data', function() {
        return redraw();
      });
      return scope.$watch('options', function() {
        return redraw();
      });
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
cyclotronDirectives.directive('collapseMenu', ['filterFilter', function(filterFilter) {
  return {
    restrict: 'EAC',
    scope: {
      items: '=',
      filter: '=',
      initialSelection: '=',
      selectItem: '&'
    },
    templateUrl: '/partials/help/collapseMenu.html',
    controller: ['$scope', function($scope) {
      $scope.unselectAll = function() {
        return _.each($scope.items, function(item) {
          item.selected = item.expanded = false;
          _.each(item.children, function(child) {
            child.selected = false;
          });
        });
      };
      $scope.selectSection = function(section) {
        $scope.unselectAll();
        section.selected = true;
        section.expanded = true;
        return $scope.selectItem({
          'item': section
        });
      };
      $scope.selectChild = function(child, section) {
        $scope.unselectAll();
        child.selected = true;
        section.expanded = true;
        return $scope.selectItem({
          'item': child
        });
      };
      $scope.findItem = function(name) {
        return _.each($scope.items, function(section) {
          var child;
          if (section.name === name) {
            $scope.selectSection(section);
            return false;
          }
          child = _.find(section.children, {
            name: name
          });
          if (child != null) {
            $scope.selectChild(child, section);
            return false;
          }
        });
      };
      $scope.$watch('filter', function(filter) {
        return $scope.isFiltered = !_.isEmpty(filter);
      });
      $scope.$on('feelingLucky', function() {
        var firstSection, firstSectionSolo, matchingChildren, matchingSections;
        matchingSections = filterFilter($scope.items, $scope.filter);
        if ((matchingSections != null ? matchingSections.length : void 0) > 0) {
          firstSection = _.first(matchingSections);
          firstSectionSolo = _.cloneDeep(firstSection);
          delete firstSectionSolo.children;
          if (filterFilter([firstSectionSolo], $scope.filter).length > 0) {
            return $scope.selectSection(firstSection);
          } else {
            matchingChildren = filterFilter(firstSection.children, $scope.filter);
            if ((matchingChildren != null ? matchingChildren.length : void 0) > 0) {
              return $scope.selectChild(_.first(matchingChildren), firstSection);
            }
          }
        }
      });
      $scope.$on('findItem', function(event, args) {
        return $scope.findItem(args.name);
      });
      if ($scope.initialSelection != null) {
        return $scope.findItem($scope.initialSelection);
      } else {
        return $scope.selectSection(_.first($scope.items));
      }
    }],
    link: function(scope, element, attrs) {}
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
cyclotronDirectives.directive('recursive', ['$compile', function($compile) {
  return {
    restrict: 'EACM',
    priority: 100000,
    compile: function(tElement, tAttr) {
      var compiledContents, contents;
      contents = tElement.contents().remove();
      compiledContents = null;
      return function(scope, iElement, iAttr) {
        if (compiledContents == null) {
          compiledContents = $compile(contents);
        }
        return iElement.append(compiledContents(scope, function(clone) {
          return clone;
        }));
      };
    }
  };
}]);

cyclotronDirectives.directive('editorPropertySet', ['configService', function(configService) {
  return {
    restrict: 'EAC',
    scope: {
      model: '=',
      excludes: '=',
      definition: '=',
      dashboard: '='
    },
    templateUrl: '/partials/editor/propertySet.html',
    controller: ['$scope', 'cryptoService', function($scope, cryptoService) {
      var update;
      $scope.booleanOptions = [true, false];
      $scope.optionsCache = {};
      $scope.aceLoaded = function(editor) {
        var encryptButton;
        editor.setOptions({
          maxLines: 2e308,
          minLines: 10,
          enableBasicAutocompletion: true
        });
        editor.focus();
        encryptButton = $(editor.container).parent().parent().find('.encrypter');
        encryptButton.unbind('click').click(function() {
          var selectedText;
          selectedText = editor.session.getTextRange(editor.getSelectionRange());
          return cryptoService.encrypt(selectedText).then(function(result) {
            editor.session.replace(editor.selection.getRange(), result);
            return $scope.model[encryptButton.data('name')] = editor.getValue();
          });
        });
        return editor.getSession().selection.on('changeSelection', function(e) {
          var selectedText;
          selectedText = editor.session.getTextRange(editor.getSelectionRange());
          if (selectedText.length > 0) {
            return encryptButton.removeClass('hidden');
          } else {
            return encryptButton.addClass('hidden');
          }
        });
      };
      $scope.aceOptions = function(mode) {
        return {
          useWrapMode: true,
          showGutter: true,
          showPrintMargin: false,
          mode: mode,
          theme: 'chrome',
          onLoad: $scope.aceLoaded
        };
      };
      $scope.getRemainingProperties = function(template, propertiesToRemove) {
        var properties;
        if (template == null) {
          return null;
        }
        if (propertiesToRemove == null) {
          propertiesToRemove = [];
        }
        properties = _.cloneDeep(_.omit(template, propertiesToRemove));
        _.each(properties, function(property, name) {
          return property['name'] = name;
        });
        return _.sortBy(properties, 'order');
      };
      $scope.addHiddenProperty = function(property) {
        if (property == null) {
          return;
        }
        _.remove($scope.hiddenProperties, function(p) {
          return p.name === property.name;
        });
        return $scope.visibleProperties.push(property);
      };
      $scope.clearProperty = function(parent, name) {
        var property;
        delete parent[name];
        property = _.find($scope.visibleProperties, {
          name: name
        });
        if (property.defaultHidden) {
          _.remove($scope.visibleProperties, {
            name: name
          });
          return $scope.hiddenProperties.push(property);
        }
      };
      $scope.addArrayValue = function(parent, name) {
        if (parent[name] == null) {
          parent[name] = [];
        }
        return parent[name].push('');
      };
      $scope.removeArrayValue = function(array, index) {
        return array.splice(index, 1);
      };
      $scope.updateArrayValue = function(array, index, value) {
        return array[index] = value;
      };
      $scope.addHashValue = function(parent, name) {
        if (parent[name] == null) {
          parent[name] = {};
        }
        return parent[name]['key'] = 'value';
      };
      $scope.getHash = function(hash) {
        return _.map(hash, function(value, key) {
          return {
            key: key,
            value: value,
            _key: key
          };
        });
      };
      $scope.updateHashKey = function(hash, hashItem) {
        hash[hashItem.key] = hash[hashItem._key];
        delete hash[hashItem._key];
        return hashItem._key = hashItem.key;
      };
      $scope.updateHashValue = function(hash, hashItem) {
        return hash[hashItem.key] = hashItem.value;
      };
      $scope.removeHashItem = function(hash, hashItem) {
        return delete hash[hashItem.key];
      };
      $scope.getOptions = function(key, options) {
        var newOptions, oldOptions;
        if (_.isFunction(options)) {
          oldOptions = $scope.optionsCache[key];
          newOptions = options($scope.dashboard);
          if ((oldOptions != null) && angular.equals(oldOptions, newOptions)) {
            return oldOptions;
          } else {
            $scope.optionsCache[key] = newOptions;
            return newOptions;
          }
        } else {
          return options;
        }
      };
      update = function() {
        if (_.isNullOrUndefined($scope.model)) {
          $scope.model = {};
        }
        $scope.remainingProperties = $scope.getRemainingProperties($scope.definition, $scope.excludes);
        $scope.visibleProperties = [];
        $scope.hiddenProperties = [];
        return _.each($scope.remainingProperties, function(property) {
          var ref;
          if (!property.defaultHidden || (((ref = $scope.model) != null ? ref[property.name] : void 0) != null)) {
            return $scope.visibleProperties.push(property);
          } else {
            return $scope.hiddenProperties.push(property);
          }
        });
      };
      $scope.$watch('definition', function(newDefinition) {
        if (!_.isEmpty(newDefinition)) {
          return update();
        }
      });
      return $scope.$watch('model', function(model) {
        if (!_.isEmpty(model)) {
          return update();
        }
      });
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
cyclotronDirectives.directive('editorViewHash', function() {
  return {
    restrict: 'EAC',
    scope: {
      label: '@',
      model: '='
    },
    templateUrl: '/partials/editor/hash.html',
    controller: ['$scope', function($scope) {
      $scope.$watch('model', function(model) {
        if (model == null) {
          return $scope.hashItems = [];
        }
      });
      $scope.addHashValue = function() {
        if ($scope.model == null) {
          $scope.model = {};
        }
        return $scope.hashItems.push({
          key: '',
          value: '',
          _key: ''
        });
      };
      $scope.updateHashKey = function(hashItem) {
        var ref;
        $scope.model[hashItem.key] = (ref = $scope.model[hashItem._key]) != null ? ref : '';
        delete $scope.model[hashItem._key];
        return hashItem._key = hashItem.key;
      };
      $scope.updateHashValue = function(hashItem) {
        return $scope.model[hashItem.key] = hashItem.value;
      };
      $scope.removeHashItem = function(hashItem) {
        delete $scope.model[hashItem.key];
        return _.remove($scope.hashItems, function(item) {
          return item === hashItem;
        });
      };
      if ($scope.model != null) {
        $scope.hashItems = _.map($scope.model, function(value, key) {
          return {
            key: key,
            value: value,
            _key: key
          };
        });
        return $scope.hashItems = _.filter($scope.hashItems, function(hashItem) {
          return hashItem._key !== '$$hashKey';
        });
      } else {
        return $scope.hashItems = [];
      }
    }],
    link: function(scope, element, attrs) {
      if (scope.label == null) {
        scope.label = 'Item';
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
cyclotronDirectives.directive('editorViewInlineArray', function() {
  return {
    restrict: 'EAC',
    scope: {
      model: '=',
      definition: '=',
      factory: '&',
      headingfn: '&'
    },
    templateUrl: '/partials/editor/inlineArray.html',
    transclude: true,
    controller: ['$scope', function($scope) {
      $scope.removeItem = function(index) {
        return $scope.model.splice(index, 1);
      };
      return $scope.addNewObject = function() {
        if ($scope.model == null) {
          $scope.model = [];
        }
        if ($scope.definition.sample != null) {
          return $scope.model.push(_.cloneDeep($scope.definition.sample));
        } else {
          return $scope.model.push({});
        }
      };
    }]
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
cyclotronDirectives.directive('editorViewObjectArray', function() {
  return {
    restrict: 'EAC',
    scope: {
      label: '@',
      substate: '@',
      model: '=',
      headingfn: '&'
    },
    templateUrl: '/partials/editor/objectArray.html',
    transclude: true,
    controller: ['$scope', function($scope) {
      $scope.removeItem = function(index) {
        return $scope.model.splice(index, 1);
      };
      $scope.cloneItem = function(index) {
        var cloneIndex, cloned, clonedName, duplicate, duplicateIndex, spliceIndex;
        cloned = angular.copy($scope.model[index]);
        spliceIndex = index;
        if (cloned.name != null) {
          cloned.name += '_clone';
          clonedName = cloned.name;
          duplicate = true;
          cloneIndex = 1;
          while (duplicate) {
            duplicateIndex = _.findIndex($scope.model, {
              'name': cloned.name
            });
            if (duplicateIndex === -1) {
              duplicate = false;
            } else {
              cloneIndex++;
              spliceIndex = duplicateIndex;
              cloned.name = clonedName + cloneIndex;
            }
          }
        }
        return $scope.model.splice(spliceIndex + 1, 0, cloned);
      };
      $scope.goToSubState = function(state, item, index) {
        return $scope.$parent.goToSubState(state, item, index);
      };
      if ($scope.model == null) {
        return $scope.model = [];
      }
    }],
    link: function(scope, element, attrs) {
      if (scope.label == null) {
        scope.label = 'Item';
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
cyclotronDirectives.directive('editorViewStringArray', function() {
  return {
    restrict: 'EAC',
    scope: {
      label: '@',
      model: '=',
      definition: '='
    },
    templateUrl: '/partials/editor/stringArray.html',
    controller: ['$scope', function($scope) {
      $scope.addArrayValue = function() {
        if ($scope.model == null) {
          $scope.model = [];
        }
        return $scope.model.push('');
      };
      $scope.updateArrayValue = function(index, value) {
        return $scope.model[index] = value;
      };
      return $scope.removeArrayValue = function(index) {
        return $scope.model.splice(index, 1);
      };
    }],
    link: function(scope, element, attrs) {
      if (scope.label == null) {
        scope.label = 'Item';
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
cyclotronDirectives.directive('error', function() {
  return {
    restrict: 'CA',
    link: function(scope, element, attrs) {
      return $('body').addClass('errorPage');
    }
  };
});


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
cyclotronDirectives.directive('focusOn', function() {
  return {
    restrict: 'AC',
    link: function(scope, element, attrs) {
      return scope.$on('focusOn', function(event, name) {
        if (attrs.focusOn === name) {
          return element[0].focus();
        }
      });
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
cyclotronDirectives.directive('jsonedit', function() {
  return {
    restrict: 'EAC',
    scope: {
      model: '='
    },
    replace: true,
    template: '<div ui-ace="aceOptions" ng-model="jsonValue"></div>',
    controller: ['$scope', 'dashboardService', function($scope, dashboardService) {
      $scope.aceLoaded = function(editor) {
        editor.setOptions({
          maxLines: 2e308,
          minLines: 10,
          enableBasicAutocompletion: true
        });
        return editor.focus();
      };
      $scope.aceOptions = {
        useWrapMode: true,
        showGutter: true,
        showPrintMargin: false,
        mode: 'json',
        theme: 'chrome',
        onLoad: $scope.aceLoaded
      };
      $scope.jsonValue = dashboardService.toString($scope.model);
      return $scope.$watch('jsonValue', function(json) {
        try {
          if ($scope.model != null) {
            return _.replaceInside($scope.model, dashboardService.parse(json));
          } else {
            return $scope.model = dashboardService.parse(json);
          }
        } catch (error) {}
      });
    }]
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
cyclotronDirectives.directive('metricsGraphics', function() {
  return {
    restrict: 'EAC',
    scope: {
      data: '=',
      options: '='
    },
    link: function(scope, element) {
      var $element, chartWidth, redraw;
      $element = $(element);
      chartWidth = $element.width();
      if (_.isEmpty($element.prop('id'))) {
        scope.id = 'mg-' + uuid.v4();
        $element.prop('id', scope.id);
      }
      redraw = function() {
        var getMouseoverText, options;
        if (scope.data == null) {
          return;
        }
        options = {
          title: null,
          height: 200,
          width: chartWidth,
          target: '#' + scope.id,
          data: scope.data,
          interpolate: 'cardinal',
          interpolate_tension: 0.95
        };
        _.assign(options, scope.options);
        if (options.mouseover != null) {
          getMouseoverText = options.mouseover;
          options.mouseover = function(d, i) {
            var text;
            text = getMouseoverText(d, i);
            return d3.select('#' + scope.id + ' svg .mg-active-datapoint').text(text);
          };
        }
        return MG.data_graphic(options);
      };
      scope.$watch('data', function(newData) {
        return redraw();
      });
      return $element.resize(_.debounce(function() {
        chartWidth = $element.width();
        return redraw();
      }, 100, {
        leading: false,
        maxWait: 300
      }));
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
cyclotronDirectives.directive('newUserMessage', function() {
  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'partials/newUserMessage.html',
    link: function(scope, element, attrs) {},
    controller: ['$scope', '$timeout', 'configService', 'logService', 'userService', function($scope, $timeout, configService, logService, userService) {
      var duration, t;
      $scope.message = configService.newUser.welcomeMessage;
      $scope.iconClass = configService.newUser.iconClass;
      $scope.canDisplay = function() {
        return configService.newUser.enableMessage && userService.isNewUser;
      };
      $scope.dismiss = function() {
        return userService.notNewUser();
      };
      duration = configService.newUser.autoDecayDuration;
      if (_.isNumber(duration)) {
        return t = $timeout(_.partial(userService.notNewUser, false), duration * 1000);
      }
    }]
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
cyclotronDirectives.directive('propertyTable', function() {
  return {
    restrict: 'EAC',
    scope: {
      properties: '='
    },
    templateUrl: 'partials/help/propertyTable.html',
    link: function(scope, element, attrs) {}
  };
});
