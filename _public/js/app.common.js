
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
_.mixin({
  'false': function() {
    return false;
  },
  'isNullOrUndefined': function(obj) {
    return _.isUndefined(obj) || _.isNull(obj);
  },
  'titleCase': function(str) {
    if (str == null) {
      return str;
    }
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1);
    });
  },
  'fromCamelCase': function(str) {
    if (str == null) {
      return str;
    }
    return str = str.replace(/^[a-z]|[a-z][A-Z]|\s[a-z]|[0-9][a-z]/g, function(txt) {
      if (txt.trim().length === 1) {
        return txt.toUpperCase();
      } else {
        return txt.charAt(0) + ' ' + txt.charAt(1).toUpperCase();
      }
    });
  },
  'slugify': function(str) {
    if (str != null) {
      return str.trim().replace(/[^A-Za-z0-9]/g, '-').toLowerCase();
    } else {
      return str;
    }
  },
  'varSub': function(str, varObj, missingNull) {
    var repl, wholeMatch;
    if (missingNull == null) {
      missingNull = false;
    }
    if (_.isNullOrUndefined(str) || _.isNullOrUndefined(varObj) || !_.isString(str)) {
      return str;
    }
    repl = function(str2, format) {
      var result;
      if (str2 in varObj) {
        result = varObj[str2];
        if (format != null) {
          return _.numeralformat(format, result);
        }
        return result;
      } else if (missingNull) {
        return null;
      } else {
        if ((format != null) & format !== '') {
          return '#{' + str2 + '|' + format + '}';
        } else {
          return '#{' + str2 + '}';
        }
      }
    };
    wholeMatch = /^\#\{([^}]*?)(\|([^}]*?))?\}$/gi.exec(str);
    if (wholeMatch !== null) {
      return repl(wholeMatch[1], wholeMatch[3]);
    } else {
      return str.replace(/\#\{(.*?)(\|(.*?))?\}/gi, function(all, inner, ignore, format) {
        return repl(inner, format);
      });
    }
  },
  'valSub': function(str, value) {
    if (_.isNullOrUndefined(str) || _.isNullOrUndefined(value) || !_.isString(str)) {
      return str;
    }
    return str.replace(/\#value/gi, function(all, inner) {
      return value;
    });
  },
  'jsEval': function(str) {
    if (_.isNullOrUndefined(str) || !_.isString(str) || str.length === 0) {
      return str;
    }
    if (str[str.length - 1] === ';') {
      str = str.substring(0, str.length - 1);
    }
    str = '(' + str + ')';
    try {
      return eval(str);
    } catch (error) {
      console.log('jsEval failure: ' + str);
      return str;
    }
  },
  'jsExec': function(str, context) {
    var wholeMatch;
    if (_.isNullOrUndefined(str) || !_.isString(str)) {
      return str;
    }
    wholeMatch = /^\$\{((.(?!\$\{))*?)\}$/gi.exec(str);
    if (wholeMatch !== null) {
      return _.jsEval(wholeMatch[1]);
    } else {
      return str.replace(/\$\{(.*?)\}/gi, function(all, inner) {
        var ref;
        return (ref = _.jsEval(inner)) != null ? ref.toString() : void 0;
      });
    }
  },
  'compile': function(obj, varObj, ignoreKeys, recursive, missingNull) {
    var compiledObj;
    if (varObj == null) {
      varObj = {};
    }
    if (ignoreKeys == null) {
      ignoreKeys = [];
    }
    if (recursive == null) {
      recursive = true;
    }
    if (missingNull == null) {
      missingNull = false;
    }
    if (_.isNullOrUndefined(obj)) {
      return obj;
    }
    if (_.isString(obj)) {
      return _.jsExec(_.varSub(obj, varObj, missingNull));
    } else if (_.isObject(obj)) {
      compiledObj = _.cloneDeep(obj);
      _.forIn(compiledObj, function(value, key) {
        var subIgnoreKeys;
        if (_.contains(ignoreKeys, key)) {
          return;
        }
        if (_.isObject(value) && !recursive) {
          return;
        }
        if (_.isFunction(value)) {
          return;
        }
        subIgnoreKeys = _.map(ignoreKeys, function(ignoreKey) {
          if (ignoreKey.indexOf(key + '.') < 0) {
            return null;
          }
          return ignoreKey.substring(ignoreKey.indexOf('.') + 1);
        });
        compiledObj[key] = _.compile(value, varObj, _.compact(subIgnoreKeys), recursive, missingNull);
      });
      return compiledObj;
    } else {
      return obj;
    }
  },
  'numeralformat': function(format, value) {
    var parsedValue;
    if (_.isNullOrUndefined(value)) {
      return null;
    }
    if (_.isNullOrUndefined(format)) {
      return value;
    }
    if (_.isEmpty(format)) {
      return value;
    }
    if (_.isNaN(value)) {
      return 'NaN';
    }
    if (!_.isNumber(value)) {
      parsedValue = parseFloat(value);
      if (_.isNaN(parsedValue)) {
        return value;
      } else {
        value = parsedValue;
      }
    }
    return numeral(value).format(format);
  },
  'ngApply': function(scope, f) {
    return function() {
      return scope.$apply(function() {
        return f();
      });
    };
  },
  'ngNonPropagatingHandler': function($scope, fn) {
    return _.compose(_["false"], _.ngApply($scope, fn));
  },
  'regexIndexOf': function(string, regex, startpos) {
    var indexOf;
    indexOf = string.substring(startpos || 0).search(regex);
    if (indexOf >= 0) {
      return indexOf + (startpos || 0);
    } else {
      return indexOf;
    }
  },
  'executeFunctionByName': function(functionName, context) {
    var args, f, func, namespaces;
    if (_.isNullOrUndefined(functionName) || _.isNullOrUndefined(context)) {
      return void 0;
    }
    args = Array.prototype.slice.call(arguments, 2);
    namespaces = functionName.split(".");
    func = namespaces.pop();
    _.each(namespaces, function(namespace) {
      return context = context[namespace];
    });
    f = context != null ? context[func] : void 0;
    if (_.isNullOrUndefined(f)) {
      return void 0;
    }
    return f.apply(context, args);
  },
  'loadCssFile': function(url) {
    var link;
    link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = url;
    return document.getElementsByTagName("head")[0].appendChild(link);
  },
  'replaceInside': function(obj, rep) {
    if (!((rep != null) && (obj != null))) {
      return rep;
    }
    _.each(_.keys(obj), function(key) {
      return delete obj[key];
    });
    return _.assign(obj, rep);
  },
  'flattenObject': function(obj) {
    var newObj;
    if (!(_.isObject(obj) && !_.isArray(obj))) {
      return obj;
    }
    newObj = {};
    _.forOwn(obj, function(value, key) {
      if (_.isObject(value) && !_.isArray(value)) {
        _.assign(newObj, _.flattenObject(value));
      } else {
        newObj[key] = value;
      }
    });
    return newObj;
  }
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
var cyclotronApp, cyclotronDataSources, cyclotronDirectives, cyclotronServices;

$(function() {
  var browserCompatible;
  browserCompatible = true;
  if (window.location.search.toLowerCase().indexOf("browsercheck=false") < 0) {
    _.forIn(Modernizr, function(value, key) {
      if (key.substring(0) === '_') {
        return;
      }
      if (value === false) {
        return browserCompatible = false;
      }
    });
  }
  if (browserCompatible === false) {
    console.log('Browser Compatibility: ' + browserCompatible);
    if (window.JSON) {
      console.log(JSON.stringify(Modernizr));
    }
    $('body').removeClass('ng-cloak');
    $('#browserError').removeClass('hidden');
    return $('body section').remove();
  } else {
    return $('#browserError').remove();
  }
});

cyclotronApp = angular.module('cyclotronApp', ['ngAnimate', 'ngResource', 'ngSanitize', 'ngTranscludeMod', 'ngNumeraljs', 'cyclotronApp.directives', 'cyclotronApp.services', 'cyclotronApp.dataSources', 'ui.router', 'ui.select', 'ui.bootstrap', 'ui.ace', 'dndLists', 'drahak.hotkeys', 'googlechart', 'LocalForageModule', 'tableSort', 'uiSwitch']);

cyclotronDirectives = angular.module('cyclotronApp.directives', []);

cyclotronDataSources = angular.module('cyclotronApp.dataSources', ['ngResource']);

cyclotronServices = angular.module('cyclotronApp.services', ['ngResource']);

cyclotronApp.config(['$stateProvider', '$urlRouterProvider', '$locationProvider', '$controllerProvider', '$compileProvider', '$provide', 'uiSelectConfig', function($stateProvider, $urlRouterProvider, $locationProvider, $controllerProvider, $compileProvider, $provide, uiSelectConfig) {
  var lazyLoad, loadExistingSession, loadExistingSessionWithoutAlerts;
  $compileProvider.debugInfoEnabled(false);
  uiSelectConfig.theme = 'select2';
  cyclotronApp.controllerProvider = $controllerProvider;
  cyclotronApp.compileProvider = $compileProvider;
  cyclotronApp.provide = $provide;
  cyclotronApp.controller = $controllerProvider.register;
  cyclotronDirectives.directive = $compileProvider.directive;
  cyclotronDataSources.factory = $provide.factory;
  cyclotronServices.factory = $provide.factory;
  cyclotronApp.loadedScripts = [];
  lazyLoad = function(jsDependencies, cssDependencies) {
    return [
      '$q', '$rootScope', function($q, $rootScope) {
        var deferred, load, unloadedScripts;
        deferred = $q.defer();
        if (cyclotronApp.loadedScripts == null) {
          cyclotronApp.loadedScripts = [];
        }
        if (cssDependencies != null) {
          _.each(cssDependencies, _.loadCssFile);
        }
        unloadedScripts = _.filter(jsDependencies, function(url) {
          var tail;
          tail = _.last(url.split('/'));
          if (_.contains(cyclotronApp.loadedScripts, tail)) {
            return false;
          }
          cyclotronApp.loadedScripts.push(tail);
          return true;
        });
        if (unloadedScripts.length > 0) {
          load = function(list) {
            var currentScript, nextInvocation;
            if (_.isEmpty(list)) {
              return $rootScope.$apply(function() {
                return deferred.resolve();
              });
            } else {
              currentScript = _.head(list);
              nextInvocation = _.wrap(_.tail(list), load);
              return $script(currentScript, nextInvocation);
            }
          };
          load(unloadedScripts);
        } else {
          deferred.resolve();
        }
        return deferred.promise;
      }
    ];
  };
  loadExistingSession = [
    'userService', function(userService) {
      return userService.loadExistingSession();
    }
  ];
  loadExistingSessionWithoutAlerts = [
    'userService', function(userService) {
      return userService.loadExistingSession(true);
    }
  ];
  $urlRouterProvider.when(/\/edit\/(.*?)\/(?!analytics).*?/i, '/edit/$1');
  $urlRouterProvider.when('/edit/:dashboardName/analytics', '/analytics/:dashboardName');
  $urlRouterProvider.when('/export/:dashboardName/:junk', '/export/:dashboardName');
  $urlRouterProvider.when('/export', '/export/');
  $stateProvider.state('home', {
    url: '/',
    templateUrl: '/partials/home.html',
    controller: 'HomeController',
    data: {
      title: 'Cyclotron'
    },
    resolve: {
      session: loadExistingSession,
      deps: lazyLoad(['/js/app.mgmt.js'], ['/css/app.mgmt.css'])
    }
  }).state('help', {
    url: '/help',
    templateUrl: '/partials/help.html',
    controller: 'HelpController',
    data: {
      title: 'Cyclotron | Help'
    },
    resolve: {
      deps: lazyLoad(['/js/app.mgmt.js'], ['/css/app.mgmt.css'])
    }
  }).state('analytics', {
    url: '/analytics',
    templateUrl: '/partials/analytics.html',
    controller: 'AnalyticsController',
    data: {
      title: 'Cyclotron | Analytics'
    },
    resolve: {
      session: loadExistingSession,
      deps: lazyLoad(['/js/app.mgmt.js'], ['/css/app.mgmt.css'])
    }
  }).state('dashboardAnalytics', {
    url: '/analytics/{dashboardName:.*}',
    templateUrl: '/partials/dashboardAnalytics.html',
    controller: 'DashboardAnalyticsController',
    data: {
      title: 'Cyclotron | Dashboard Analytics'
    },
    resolve: {
      session: loadExistingSession,
      deps: lazyLoad(['/js/app.mgmt.js'], ['/css/app.mgmt.css'])
    }
  }).state('export', {
    url: '/export/{dashboardName:.*}',
    templateUrl: '/partials/export.html',
    controller: 'ExportController',
    data: {
      title: 'Cyclotron | Export'
    },
    resolve: {
      session: loadExistingSession,
      deps: lazyLoad(['/js/app.mgmt.js'], ['/css/app.mgmt.css'])
    }
  }).state('edit', {
    abstract: true,
    url: '/edit/{dashboardName:.*}',
    templateUrl: '/partials/editor/guiEditor.html',
    controller: 'GuiEditorController',
    data: {
      title: 'Cyclotron | Edit'
    },
    resolve: {
      session: loadExistingSession,
      deps: lazyLoad(['/js/app.mgmt.js'], ['/css/app.mgmt.css'])
    }
  }).state('edit.details', {
    url: '',
    templateUrl: '/partials/editor/details.html',
    data: {
      title: 'Cyclotron | Edit | Details'
    }
  }).state('edit.json', {
    url: '',
    templateUrl: '/partials/editor/jsonEditor.html',
    data: {
      title: 'Cyclotron | Edit | JSON'
    }
  }).state('edit.dataSources', {
    url: '',
    templateUrl: '/partials/editor/dataSources.html',
    data: {
      title: 'Cyclotron | Edit | Data Sources'
    }
  }).state('edit.dataSource', {
    url: '',
    templateUrl: '/partials/editor/dataSource.html',
    controller: 'DataSourceEditorController',
    data: {
      title: 'Cyclotron | Edit | Data Sources'
    }
  }).state('edit.pages', {
    templateUrl: '/partials/editor/pages.html',
    data: {
      title: 'Cyclotron | Edit | Pages'
    }
  }).state('edit.page', {
    templateUrl: '/partials/editor/page.html',
    controller: 'PageEditorController',
    data: {
      title: 'Cyclotron | Edit | Pages'
    }
  }).state('edit.widget', {
    templateUrl: '/partials/editor/widget.html',
    data: {
      title: 'Cyclotron | Edit | Widget'
    }
  }).state('edit.parameters', {
    url: '',
    templateUrl: '/partials/editor/parameters.html',
    data: {
      title: 'Cyclotron | Edit | Parameters'
    }
  }).state('edit.parameter', {
    url: '',
    templateUrl: '/partials/editor/parameter.html',
    data: {
      title: 'Cyclotron | Edit | Parameters'
    }
  }).state('edit.scripts', {
    url: '',
    templateUrl: '/partials/editor/scripts.html',
    data: {
      title: 'Cyclotron | Edit | Scripts'
    }
  }).state('edit.script', {
    url: '',
    templateUrl: '/partials/editor/script.html',
    data: {
      title: 'Cyclotron | Edit | Scripts'
    }
  }).state('edit.styles', {
    url: '',
    templateUrl: '/partials/editor/styles.html',
    data: {
      title: 'Cyclotron | Edit | Styles'
    }
  }).state('edit.style', {
    url: '',
    templateUrl: '/partials/editor/style.html',
    data: {
      title: 'Cyclotron | Edit | Styles'
    }
  }).state('dashboardHistory', {
    url: '/history/{dashboardName:.*}',
    templateUrl: '/partials/dashboardHistory.html',
    controller: 'DashboardHistoryController',
    data: {
      title: 'Cyclotron | Dashboard History'
    },
    resolve: {
      session: loadExistingSession,
      deps: lazyLoad(['/js/app.mgmt.js'], ['/css/app.mgmt.css'])
    }
  }).state('dashboard', {
    url: '/{dashboard:.+}',
    templateUrl: '/partials/dashboard.html',
    controller: 'DashboardController',
    data: {
      title: 'Cyclotron',
      reloadOnSearch: false
    },
    resolve: {
      session: loadExistingSessionWithoutAlerts,
      deps: lazyLoad(['/js/app.dashboards.js', '/js/app.widgets.js'], ['/css/app.dashboards.css'])
    }
  });
  $urlRouterProvider.otherwise('/');
  $urlRouterProvider.deferIntercept();
  $locationProvider.html5Mode({
    enabled: true,
    requireBase: false
  });
  return $locationProvider.hashPrefix = '!';
}]);

cyclotronApp.run(['$rootScope', '$urlRouter', '$location', '$state', '$stateParams', '$uibModal', 'analyticsService', 'configService', 'userService', function($rootScope, $urlRouter, $location, $state, $stateParams, $uibModal, analyticsService, configService, userService) {
  $rootScope.isLoggedIn = userService.isLoggedIn;
  $rootScope.isAdmin = userService.isAdmin;
  $rootScope.currentUser = userService.currentUser;
  $rootScope.analyticsEnabled = function() {
    var ref;
    return ((ref = configService.analytics) != null ? ref.enable : void 0) === true;
  };
  $rootScope.login = function(isModal) {
    var modalInstance, options;
    if (isModal == null) {
      isModal = false;
    }
    options = {
      templateUrl: '/partials/login.html',
      controller: 'LoginController'
    };
    if (isModal) {
      options.backdrop = 'static';
      options.keyboard = false;
    }
    modalInstance = $uibModal.open(options);
    return modalInstance.result;
  };
  $rootScope.logout = userService.logout;
  $rootScope.$on('login', function(event) {
    return analyticsService.recordEvent('login', {});
  });
  $rootScope.$on('logout', function(event) {
    return analyticsService.recordEvent('logout', {});
  });
  $rootScope.userTooltip = function() {
    if (!userService.authEnabled) {
      return '';
    }
    return 'Logged In: ' + userService.currentUser().name;
  };
  $rootScope.userGravatar = function() {
    if (!userService.authEnabled) {
      return '';
    }
    return 'http://www.gravatar.com/avatar/' + userService.currentUser().emailHash + '?r=g&d=mm&s=24';
  };
  $rootScope.$state = $state;
  $rootScope.$stateParams = $stateParams;
  $rootScope.page_title = 'Cyclotron';
  $rootScope.$on('$stateChangeSuccess', function(event, toState, fromState) {
    if (toState != null) {
      $rootScope.$state = toState;
      $rootScope.$stateParams = $stateParams;
      return $rootScope.page_title = toState.data.title;
    }
  });
  $rootScope.$on('$locationChangeSuccess', function(event, newUrl, oldUrl) {
    event.preventDefault();
    if ($state.current.name !== 'dashboard') {
      return $urlRouter.sync();
    }
  });
  $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) {
    return console.log('$stateChangeError', event, toState, toParams, fromState, fromParams, error);
  });
  return $urlRouter.listen();
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
  $scope.goHome = function() {
    $uibModalInstance.dismiss();
    return $state.go('home');
  };
  $scope.reload = function() {
    $uibModalInstance.dismiss();
    return $state.reload();
  };
  return $scope.goEditor = function() {
    $uibModalInstance.dismiss();
    return $state.go('edit.details', {
      dashboardName: $scope.originalDashboardName
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
cyclotronApp.controller('LoginController', ['$scope', '$uibModalInstance', '$localForage', 'configService', 'focusService', 'userService', function($scope, $uibModalInstance, $localForage, configService, focusService, userService) {
  $scope.credentials = {};
  $scope.loginError = false;
  if ($scope.loginMessage == null) {
    $scope.loginMessage = configService.authentication.loginMessage;
  }
  if (userService.cachedUsername != null) {
    $scope.credentials.username = userService.cachedUsername;
    focusService.focus('focusPassword', $scope);
  } else {
    focusService.focus('focusUsername', $scope);
  }
  $scope.canLogin = function() {
    return !_.isEmpty($scope.credentials.username) && !_.isEmpty($scope.credentials.password);
  };
  $scope.login = function() {
    var loginPromise;
    $scope.loginError = false;
    loginPromise = userService.login($scope.credentials.username, $scope.credentials.password);
    loginPromise.then(function(session) {
      $scope.credentials.password = '';
      return $uibModalInstance.close(session);
    });
    return loginPromise["catch"](function(error) {
      $scope.loginError = true;
      $scope.credentials.password = '';
      return focusService.focus('focusPassword', $scope);
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
cyclotronDirectives.directive('fullscreen', function() {
  return {
    restrict: 'CA',
    link: function(scope, element, attrs) {
      $(element).parents().addClass('fullscreen');
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
cyclotronDirectives.directive('requiresAuth', ['userService', function(userService) {
  return {
    restrict: 'CA',
    link: function(scope, element, attrs) {
      if (!userService.authEnabled) {
        return $(element).hide();
      }
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
cyclotronDirectives.directive('requiresLogin', ['userService', function(userService) {
  return {
    restrict: 'CA',
    link: function(scope, element, attrs) {
      if (!(userService.authEnabled && userService.isLoggedIn())) {
        $(element).hide();
      }
      return scope.$watch(userService.isLoggedIn, function() {
        if (userService.authEnabled && userService.isLoggedIn()) {
          return $(element).show();
        } else {
          return $(element).hide();
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
cyclotronDirectives.directive('spinjs', function() {
  return {
    restrict: 'CA',
    link: function(scope, element, attrs) {
      var elementWidth, length, opts, radius, spinner;
      elementWidth = $(element).parent().width();
      if (elementWidth < 300) {
        radius = elementWidth / 10.0;
        length = radius * 0.666;
      } else {
        radius = 30;
        length = 20;
      }
      opts = {
        lines: 13,
        length: length,
        width: 10,
        radius: radius,
        corners: 1,
        rotate: 0,
        direction: 1,
        color: '#888',
        speed: .77,
        trail: 60,
        shadow: false,
        hwaccel: false,
        className: 'spinner',
        zIndex: 2e9,
        top: 'auto',
        left: 'auto'
      };
      spinner = new Spinner(opts).spin();
      return element.append(spinner.el);
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
cyclotronServices.factory('analyticsService', ['$http', '$q', '$localForage', '$location', 'configService', 'logService', 'userService', function($http, $q, $localForage, $location, configService, logService, userService) {
  var analyticsHelper, exports, uidLoaded;
  analyticsHelper = function(name, endpoint, dashboardId, startDate, endDate) {
    var duration, parameters;
    parameters = {};
    if (dashboardId != null) {
      parameters.dashboard = dashboardId;
    }
    if (startDate != null) {
      parameters.startDate = startDate.toISOString();
    }
    if (endDate != null) {
      parameters.endDate = endDate.toISOString();
    }
    if (startDate != null) {
      if ((startDate != null) && (endDate == null)) {
        endDate = moment();
      }
      duration = endDate.diff(startDate, 'hours');
      if (duration > 72) {
        parameters.resolution = 'day';
      } else if (duration > 4) {
        parameters.resolution = 'hour';
      } else {
        parameters.resolution = 'minute';
      }
    }
    return $http.get(configService.restServiceUrl + '/analytics/' + endpoint, {
      params: parameters
    }).then(function(result) {
      _.each(result.data, function(row) {
        if (row.date != null) {
          return row.date = new Date(row.date);
        }
      });
      return result.data;
    })["catch"](function(error) {
      return alertify.error('Cannot connect to cyclotron-svc (' + name + ')', 2500);
    });
  };
  exports = {
    visitId: uuid.v4(),
    uid: null,
    currentDashboard: null,
    currentPage: null,
    isExporting: $location.search().exporting === 'true',
    getPageViewsOverTime: function(dashboardId, startDate, endDate) {
      return analyticsHelper('getPageViewsOverTime', 'pageviewsovertime', dashboardId, startDate, endDate);
    },
    getVisitsOverTime: function(dashboardId, startDate, endDate) {
      return analyticsHelper('getVisitsOverTime', 'visitsovertime', dashboardId, startDate, endDate);
    },
    getUniqueVisitors: function(dashboardId, startDate, endDate) {
      return analyticsHelper('getUniqueVisitors', 'uniquevisitors', dashboardId, startDate, endDate);
    },
    getBrowsers: function(dashboardId, startDate, endDate) {
      return analyticsHelper('getBrowsers', 'browsers', dashboardId, startDate, endDate);
    },
    getWidgets: function(dashboardId, startDate, endDate) {
      return analyticsHelper('getWidgets', 'widgets', dashboardId, startDate, endDate);
    },
    getPageViewsPerPage: function(dashboardId, startDate, endDate) {
      return analyticsHelper('getPageViewsPerPage', 'pageviewsbypage', dashboardId, startDate, endDate);
    },
    getDataSourcesByType: function(dashboardId, startDate, endDate) {
      return analyticsHelper('getDataSourcesByType', 'datasourcesbytype', dashboardId, startDate, endDate);
    },
    getDataSourcesByName: function(dashboardId, startDate, endDate) {
      return analyticsHelper('getDataSourcesByName', 'datasourcesbyname', dashboardId, startDate, endDate);
    },
    getDataSourcesByError: function(dashboardId, startDate, endDate) {
      return analyticsHelper('getDataSourcesByError', 'datasourcesbyerrormessage', dashboardId, startDate, endDate);
    },
    getTopDashboards: function() {
      return $http.get(configService.restServiceUrl + '/analytics/topdashboards').then(function(result) {
        return result.data;
      })["catch"](function(error) {
        return alertify.error('Cannot connect to cyclotron-svc (getTopDashboards)', 2500);
      });
    },
    getStatistics: function() {
      return $http.get(configService.restServiceUrl + '/statistics').then(function(result) {
        return result.data;
      })["catch"](function(error) {
        return alertify.error('Cannot connect to cyclotron-svc (getStatistics)', 2500);
      });
    }
  };
  uidLoaded = $q.defer();
  $localForage.getItem('uid').then(function(existingUid) {
    if (existingUid == null) {
      exports.uid = uuid.v4();
      $localForage.setItem('uid', exports.uid);
    } else {
      exports.uid = existingUid;
    }
    return uidLoaded.resolve();
  });
  exports.recordPageView = function(dashboard, pageIndex, newVisit) {
    var req, widgets;
    if (newVisit == null) {
      newVisit = false;
    }
    if (!configService.analytics.enable) {
      return;
    }
    exports.currentDashboard = dashboard;
    exports.currentPage = pageIndex;
    widgets = _.reject(dashboard.dashboard.pages[pageIndex].widgets, {
      hidden: true
    });
    req = {
      visitId: exports.visitId,
      dashboard: {
        _id: dashboard._id,
        name: dashboard.name
      },
      rev: dashboard.rev,
      page: pageIndex,
      widgets: _.pluck(widgets, 'widget'),
      browser: {
        name: bowser.name,
        version: bowser.version
      }
    };
    return uidLoaded.promise.then(function() {
      if (userService.authEnabled && userService.isLoggedIn()) {
        req.user = {
          _id: userService.currentUser()._id,
          sAMAccountName: userService.currentUser().sAMAccountName,
          name: userService.currentUser().name
        };
      } else {
        req.uid = exports.uid;
        if (userService.cachedUserId != null) {
          req.user = {
            _id: userService.cachedUserId
          };
        }
      }
      logService.debug('Page View Analytics:', req);
      return $http.post(configService.restServiceUrl + '/analytics/pageviews?newVisit=' + newVisit + '&' + 'exporting=' + exports.isExporting, req);
    });
  };
  exports.recordDataSource = function(dataSource, success, duration, details) {
    var req;
    if (details == null) {
      details = {};
    }
    if (!(configService.analytics.enable && !exports.isExporting)) {
      return;
    }
    details = _.merge(details, _.pick(dataSource, ['url', 'proxy', 'refresh']));
    req = {
      visitId: exports.visitId,
      dashboard: {
        _id: exports.currentDashboard._id,
        name: exports.currentDashboard.name
      },
      rev: exports.currentDashboard.rev,
      page: exports.currentPage,
      dataSourceName: dataSource.name,
      dataSourceType: dataSource.type,
      success: success,
      duration: duration,
      details: details
    };
    logService.debug('Data Source Analytics:', req);
    return $http.post(configService.restServiceUrl + '/analytics/datasources', req);
  };
  exports.recordEvent = function(type, details) {
    var req;
    if (details == null) {
      details = {};
    }
    if (!configService.analytics.enable) {
      return;
    }
    req = {
      eventType: type,
      visitId: exports.visitId,
      details: details
    };
    if (exports.currentDashboard != null) {
      req.dashboard = {
        _id: exports.currentDashboard._id,
        name: exports.currentDashboard.name
      };
    }
    return uidLoaded.promise.then(function() {
      if (userService.authEnabled && userService.isLoggedIn()) {
        req.user = {
          _id: userService.currentUser()._id,
          sAMAccountName: userService.currentUser().sAMAccountName,
          name: userService.currentUser().name
        };
      } else {
        req.uid = exports.uid;
        if (userService.cachedUserId != null) {
          req.user = {
            _id: userService.cachedUserId
          };
        }
      }
      logService.debug('Event Analytics:', req);
      return $http.post(configService.restServiceUrl + '/analytics/events', req);
    });
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
cyclotronServices.factory('commonConfigService', function() {
  var datasourceOptions, exports, helpDashboards, helpDataSources, helpWidgets, linkedWidgetOptions, propertyMapHelper, tableProperties;
  linkedWidgetOptions = function(dashboard) {
    var linkedWidgets;
    linkedWidgets = {};
    _.each(dashboard.pages, function(page, pageIndex) {
      return _.each(page.widgets, function(widget, widgetIndex) {
        var ref, ref1, widgetName;
        if (widget.widget === 'linkedWidget') {
          return;
        }
        widgetName = _.titleCase(widget.widget);
        if (((ref = widget.name) != null ? ref.length : void 0) > 0 || ((ref1 = widget.title) != null ? ref1.length : void 0) > 0) {
          widgetName += ': ' + (widget.name || widget.title);
        }
        return linkedWidgets['Page ' + (pageIndex + 1) + ': ' + widgetName] = {
          value: pageIndex + ',' + widgetIndex
        };
      });
    });
    return linkedWidgets;
  };
  datasourceOptions = function(dashboard) {
    var dataSources;
    dataSources = {};
    _.each(dashboard.dataSources, function(dataSource) {
      return dataSources[dataSource.name] = {
        value: dataSource.name
      };
    });
    return dataSources;
  };
  exports = {
    version: '1.48.0',
    logging: {
      enableDebug: false
    },
    authentication: {
      enable: false,
      loginMessage: 'Please login using your LDAP username and password.'
    },
    analytics: {
      enable: false
    },
    newUser: {
      enableMessage: true,
      welcomeMessage: 'It looks like you\'re new here!  Take a look at the <a href="/help"><i class="fa fa-question-circle" /> Help</a> page.',
      iconClass: 'fa-info',
      autoDecayDuration: 1
    },
    dashboard: {
      properties: {
        name: {
          label: 'Name',
          description: 'Dashboard Name. This is required and cannot be changed after the Dashboard is created.',
          placeholder: 'Dashboard Name',
          type: 'string',
          required: true,
          order: 0
        },
        displayName: {
          label: 'Display Name',
          description: 'Display Name; this is displayed in the browser title bar or the Header Widget.',
          placeholder: 'Display Name',
          type: 'string',
          required: false,
          inlineJs: true,
          defaultHidden: true,
          order: 1
        },
        description: {
          label: 'Description',
          description: 'A short summary of the Dashboard\'s purpose or capabilities.',
          placeholder: 'A short summary of the Dashboard\'s purpose or capabilities.',
          type: 'string',
          required: false,
          order: 2
        },
        theme: {
          label: 'Theme',
          description: 'The default Page Theme for the Dashboard. If this property is set, the value will be applied to any Pages that have not specified a Theme. If it is not set, the default value of "Dark" will be used.',
          type: 'string',
          "default": 'dark',
          required: false,
          options: {
            charcoal: {
              label: 'Charcoal',
              value: 'charcoal',
              dashboardBackgroundColor: '#1E2328'
            },
            dark: {
              label: 'Dark',
              value: 'dark',
              dashboardBackgroundColor: '#2f2f2f'
            },
            darkmetro: {
              label: 'Dark Metro',
              value: 'darkmetro',
              dashboardBackgroundColor: '#2f2f2f'
            },
            gto: {
              label: 'GTO',
              value: 'gto',
              dashboardBackgroundColor: 'white'
            },
            light: {
              label: 'Light',
              value: 'light',
              dashboardBackgroundColor: 'white'
            },
            lightborderless: {
              label: 'Light (borderless)',
              value: 'lightborderless',
              dashboardBackgroundColor: 'white'
            },
            dark2: {
              label: 'Very Dark',
              value: 'dark2',
              dashboardBackgroundColor: 'black'
            }
          },
          order: 5
        },
        themeVariant: {
          label: 'Theme Variant',
          description: 'The default Theme Variant for the Dashboard; each Theme may or may not implement each variant. If this property is set, the value will be applies to any Pages that have not specified a Theme Variant. If it is not set, the default variant will be used.',
          type: 'string',
          "default": 'default',
          required: false,
          defaultHidden: true,
          options: {
            "default": {
              value: 'default'
            },
            transparent: {
              value: 'transparent'
            },
            'transparent-unpadded': {
              value: 'transparent-unpadded'
            }
          },
          order: 6
        },
        style: {
          label: 'Style',
          description: 'The default Page Style for the Dashboard. If this property is set, the value will be applied to any Pages that have not specified a Style. If it is not set, the default value of "Normal" will be used.',
          type: 'string',
          "default": 'normal',
          required: false,
          options: {
            normal: {
              value: 'normal'
            },
            fullscreen: {
              value: 'fullscreen'
            }
          },
          defaultHidden: true,
          order: 7
        },
        autoRotate: {
          label: 'Auto-Rotate',
          description: 'If set to true, Cyclotron will automatically rotate between pages of the Dashboard based on the duration property for each Page. Set this value false to require manual rotation.',
          type: 'boolean',
          "default": false,
          required: false,
          defaultHidden: true,
          order: 10
        },
        duration: {
          label: 'Auto-Rotate Duration (seconds)',
          description: 'If autoRotate is enabled, this controls the default interval to rotate to the next page. This value can be overridded at a page level.',
          type: 'integer',
          placeholder: 'Seconds per page',
          "default": 60,
          required: false,
          defaultHidden: true,
          order: 11
        },
        preload: {
          label: 'Pre-Load Time (seconds)',
          description: 'The amount of time, in seconds, before rotating to preload the next page. If set, this value will apply to all pages in the Dashboard. If autoRotate is false, this value is ignored.',
          placeholder: 'Seconds',
          type: 'integer',
          "default": 0.050,
          required: false,
          defaultHidden: true,
          order: 12
        },
        allowFullscreen: {
          label: 'Allow Fullscreen',
          description: 'If true, each Widget on a Page can be maximized to fill the entire Dashboard. This setting can be overridden by each Page/Widget.',
          type: 'boolean',
          "default": true,
          required: false,
          defaultHidden: true
        },
        allowExport: {
          label: 'Allow Export',
          description: 'If true, the Widget data can be exported via a dropdown menu in the Widget. This setting can be overridden by each Page/Widget.',
          type: 'boolean',
          "default": true,
          required: false,
          defaultHidden: true
        },
        openLinksInNewWindow: {
          label: 'Open Links in New Window',
          description: 'If true, all links will open in a new browser window; this is the default.',
          type: 'boolean',
          required: false,
          "default": true,
          defaultHidden: true
        },
        showWidgetErrors: {
          label: 'Show Error Messages on Widgets',
          description: 'If true, allows error messages to be displayed on Widgets. This setting can be overridden by each Page/Widget.',
          type: 'boolean',
          required: false,
          "default": true,
          defaultHidden: true
        },
        showDashboardControls: {
          label: 'Show Dashboard Controls',
          description: 'If false, hides the default Dashboard controls (rotation, export, etc)',
          type: 'boolean',
          required: false,
          "default": true,
          defaultHidden: true
        },
        sidebar: {
          label: 'Sidebar',
          description: '',
          type: 'propertyset',
          "default": {},
          defaultHidden: true,
          properties: {
            showDashboardSidebar: {
              label: 'Show Dashboard Sidebar',
              description: 'If false, hides the default Dashboard Sidebar.',
              type: 'boolean',
              required: false,
              "default": false,
              order: 10
            },
            showDashboardTitle: {
              label: 'Include Dashboard Title',
              description: 'Enables a section of the sidebar for the Dashboard title.',
              type: 'boolean',
              required: false,
              "default": true,
              defaultHidden: true,
              order: 11
            },
            showToolbar: {
              label: 'Include Toolbar',
              description: 'Enables a toolbar in the sidebar.',
              type: 'boolean',
              required: false,
              "default": true,
              defaultHidden: true,
              order: 12
            },
            showHideWidgets: {
              label: 'Include Show/Hide Widgets',
              description: 'Enables a section of the sidebar for overriding the visibility of Widgets.',
              type: 'boolean',
              required: false,
              "default": false,
              defaultHidden: true,
              order: 13
            },
            sidebarContent: {
              label: 'Custom Sidebar Sections',
              singleLabel: 'Section',
              description: 'One or more sections of content to display in the Sidebar.',
              type: 'propertyset[]',
              "default": [],
              order: 15,
              properties: {
                heading: {
                  label: 'Heading',
                  description: 'Heading for the Sidebar section.',
                  type: 'string',
                  inlineJs: true,
                  order: 1
                },
                html: {
                  label: 'HTML Content',
                  description: 'HTML Content to display.',
                  placeholder: 'Value',
                  type: 'editor',
                  editorMode: 'html',
                  inlineJs: true,
                  order: 2
                }
              }
            }
          }
        },
        pages: {
          label: 'Pages',
          description: 'The list of Page definitions which compose the Dashboard.',
          type: 'pages',
          "default": [],
          required: true,
          properties: {
            name: {
              label: 'Name',
              description: 'Name of this page; used in the browser title and URL.',
              placeholder: 'Page Name',
              type: 'string',
              required: false,
              order: 0
            },
            layout: {
              label: 'Layout',
              description: 'Contains properties for configuring the Page layout and dimensions.',
              type: 'propertyset',
              "default": {},
              required: false,
              properties: {
                gridColumns: {
                  label: 'Grid Columns',
                  description: 'Specifies the total number of horizonal grid squares available in the grid. The grid squares will be scaled to fit the browser window. If omitted, the number of columns will be calculated dynamically.',
                  type: 'integer',
                  required: false,
                  order: 0
                },
                gridRows: {
                  label: 'Grid Rows',
                  description: 'Specifies the total number of vertical grid squares available in the grid. The grid squares will be scaled vertically to fit the browser window. If omitted, the grid squares will be literally square, e.g. the height and width will be the same. When omitted, the widgets may not fill the entire browser window, or they may scroll vertically. Use this property to make widgets scale vertically to fit the dashboard.',
                  type: 'integer',
                  required: false,
                  order: 1
                },
                gridWidthAdjustment: {
                  label: 'Grid Page Width Adjustment',
                  description: 'Specifies an adjustment (in pixels) to the width of the page when calculating the grid layout.  If the value is positive, the page width will have the adjustment added to it (making each column wider), whereas if it is negative, the page width will be reduced (making each column skinnier).',
                  type: 'integer',
                  "default": 0,
                  required: false,
                  defaultHidden: true,
                  order: 2
                },
                gridHeightAdjustment: {
                  label: 'Grid Page Height Adjustment',
                  description: 'Specifies an adjustment (in pixels) to the height of the page when calculating the grid layout.  If the value is positive, the page height will have the adjustment added to it (making each row taller), whereas if it is negative, the page height will be reduced (making each row shorter). This is commonly used with a fixed-height Header widget.',
                  type: 'integer',
                  "default": 0,
                  required: false,
                  order: 3
                },
                gutter: {
                  label: 'Gutter',
                  description: 'Controls the space (in pixels) between widgets positioned in the grid. The default value is 10.',
                  type: 'integer',
                  "default": 10,
                  required: false,
                  defaultHidden: true,
                  order: 5
                },
                borderWidth: {
                  label: 'Border Width',
                  description: 'Specifies the pixel width of the border around each widget. Can be set to 0 to remove the border. If omitted, the theme default will be used.',
                  type: 'integer',
                  "default": null,
                  required: false,
                  defaultHidden: true,
                  order: 6
                },
                margin: {
                  label: 'Margin',
                  description: 'Controls the empty margin width (in pixels) around the outer edge of the Dashboard. Can be set to 0 to remove the margin.',
                  type: 'integer',
                  "default": 10,
                  required: false,
                  defaultHidden: true,
                  order: 7
                },
                scrolling: {
                  label: 'Scrolling Enabled',
                  description: 'Enables vertical scrolling of the page to display content longer than the current browser size.',
                  type: 'boolean',
                  "default": true,
                  required: false,
                  defaultHidden: true,
                  order: 8
                }
              },
              order: 2
            },
            widgets: {
              label: 'Widgets',
              description: 'An array of one or more Widgets to display on the page',
              type: 'propertyset[]',
              subState: 'edit.widget',
              headingfn: 'getWidgetName',
              "default": [],
              required: true,
              properties: {
                widget: {
                  label: 'Type',
                  description: 'The type of Widget to be rendered.',
                  type: 'string',
                  required: true
                },
                name: {
                  label: 'Name',
                  description: 'Internal Widget name, displayed in the Dashboard Editor.',
                  placeholder: 'Name',
                  type: 'string',
                  required: false,
                  defaultHidden: true,
                  inlineJs: false,
                  order: 1
                },
                title: {
                  label: 'Title',
                  description: 'Specifies the title of the widget. Most widgets will display the title at the top of the widget. If omitted, nothing will be displayed and the widget contents will occupy the entire widget boundaries.',
                  placeholder: 'Widget Title',
                  type: 'string',
                  required: false,
                  inlineJs: true,
                  order: 2
                },
                gridHeight: {
                  label: 'Grid Rows',
                  description: 'Specifies the number of vertical grid squares for this widget to occupy. Instead of an absolute height, this sets the relative size based on grid units.',
                  placeholder: 'Number of Rows',
                  type: 'integer',
                  "default": '1',
                  required: false,
                  order: 100
                },
                gridWidth: {
                  label: 'Grid Columns',
                  description: 'Specifies the number of horizontal grid squares for this widget to occupy. Instead of an absolute width, this sets the relative size based on grid units.',
                  placeholder: 'Number of Columns',
                  type: 'integer',
                  "default": '1',
                  required: false,
                  order: 101
                },
                height: {
                  label: 'Height',
                  description: 'If set, specifies the absolute display height of the widget. Any valid CSS value can be used (e.g. "200px", "40%", etc).',
                  placeholder: 'Height',
                  type: 'string',
                  required: false,
                  defaultHidden: true,
                  order: 102
                },
                width: {
                  label: 'Width',
                  description: 'If set, specifies the absolute display width of the widget. Any valid CSS value can be used (e.g. "200px", "40%", etc).',
                  placeholder: 'Width',
                  type: 'string',
                  required: false,
                  defaultHidden: true,
                  order: 103
                },
                autoHeight: {
                  label: 'Auto-Height (Fit to Contents)',
                  description: 'If true, disables both the gridHeight and height properties, and allows the Widget to be vertically sized to fit its contents.',
                  type: 'boolean',
                  required: false,
                  defaultHidden: true,
                  order: 104
                },
                helpText: {
                  label: 'Help Text',
                  description: 'Provides an optional help text for the Widget, available via a help icon in the corner of the Widget.',
                  type: 'string',
                  required: false,
                  inlineJs: true,
                  defaultHidden: true,
                  order: 109
                },
                theme: {
                  label: 'Theme',
                  description: 'If set, overrides the Page theme and allows a widget to have a different theme from the rest of the Page and Widgets.',
                  type: 'string',
                  inherit: true,
                  required: false,
                  defaultHidden: true,
                  order: 110
                },
                themeVariant: {
                  label: 'Theme Variant',
                  description: 'If set, overrides the Page theme variant and allows a widget to have a different theme variant from the rest of the Page and Widgets.',
                  type: 'string',
                  inherit: true,
                  required: false,
                  defaultHidden: true,
                  order: 111
                },
                noData: {
                  label: 'No Data Message',
                  description: 'If set, displays this message in the Widget when no data is loaded from the Data Source. If not set, no message will be displayed',
                  type: 'string',
                  inlineJs: true,
                  required: false,
                  defaultHidden: true,
                  order: 120
                },
                noscroll: {
                  label: 'No Scroll',
                  description: 'If set to true, the widget will not have scrollbars and any overflow will be hidden. The effect of this setting varies per widget.',
                  type: 'boolean',
                  "default": false,
                  required: false,
                  defaultHidden: true,
                  order: 121
                },
                allowFullscreen: {
                  label: 'Allow Fullscreen',
                  description: 'If true, the Widget can be maximized to fill the entire Dashboard; if false, the ability to view in fullscreen is disabled. This property overrides the Page setting.',
                  type: 'boolean',
                  inherit: true,
                  required: false,
                  defaultHidden: true,
                  order: 122
                },
                allowExport: {
                  label: 'Allow Export',
                  description: 'If true, the Widget data can be exported via a dropdown menu in the Widget. This property overrides the Page setting.',
                  type: 'boolean',
                  inherit: true,
                  required: false,
                  defaultHidden: true,
                  order: 123
                },
                showWidgetErrors: {
                  label: 'Show Error Messages on Widgets',
                  description: 'If true, allows error messages to be displayed on Widgets. This property overrides the Page setting.',
                  type: 'boolean',
                  required: false,
                  inherit: true,
                  defaultHidden: true,
                  order: 124
                },
                hidden: {
                  label: 'Hidden',
                  description: 'If true, the Widget will not be displayed in the Dashboard and will not occupy space in the Layout rendering. The Widget will still be initialized, however.',
                  type: 'boolean',
                  "default": false,
                  required: false,
                  defaultHidden: true,
                  order: 125
                }
              },
              order: 3
            },
            duration: {
              label: 'Auto-Rotate Duration (seconds)',
              description: 'The number of seconds to remain on this page before rotating to the next page. If autoRotate is set to false, this value is ignored.',
              placeholder: 'Seconds per page',
              inherit: true,
              type: 'integer',
              required: false,
              defaultHidden: true,
              order: 4
            },
            frequency: {
              label: 'Frequency',
              description: 'If greater than one, this page will only be shown on every N cycles through the dashboard. Defaults to 1, meaning the Page will be shown on every cycle.',
              "default": 1,
              type: 'integer',
              required: false,
              defaultHidden: true,
              order: 5
            },
            theme: {
              label: 'Theme',
              description: 'The theme for the Page. If not set, the Dashboard setting or default value will apply.',
              type: 'string',
              inherit: true,
              required: false,
              defaultHidden: true,
              order: 6
            },
            themeVariant: {
              label: 'Theme Variant',
              description: 'The theme variant for the Page.  If not set, the Dashboard setting or default value will apply.',
              type: 'string',
              inherit: true,
              required: false,
              defaultHidden: true,
              order: 7
            },
            style: {
              label: 'Style',
              description: 'The style for the Page. If not set, the Dashboard setting or default value will apply.',
              type: 'string',
              inherit: true,
              required: false,
              defaultHidden: true,
              order: 8
            },
            allowFullscreen: {
              label: 'Allow Fullscreen',
              description: 'If true, each Widget on the page can be maximized to fill the entire Dashboard. This setting can be overridden by each Widget.',
              type: 'boolean',
              inherit: true,
              required: false,
              defaultHidden: true,
              order: 10
            },
            allowExport: {
              label: 'Allow Export',
              description: 'If true, the Widget data can be exported via a dropdown menu in the Widget. This setting can be overridden by each Widget.',
              type: 'boolean',
              inherit: true,
              required: false,
              defaultHidden: true,
              order: 11
            },
            showWidgetErrors: {
              label: 'Show Error Messages on Widgets',
              description: 'If true, allows error messages to be displayed on Widgets. This setting can be overridden by each Widget.',
              type: 'boolean',
              required: false,
              inherit: true,
              defaultHidden: true,
              order: 12
            }
          }
        },
        dataSources: {
          label: 'Data Sources',
          description: 'A list of Data Sources which connect to external services and pull in data for the Dashboard.',
          type: 'datasources',
          "default": [],
          required: false,
          properties: {
            name: {
              label: 'Name',
              description: 'The Data Source Name is used to reference the Data Source from a widget',
              placeholder: 'Data Source Name',
              type: 'string',
              required: true,
              order: 1
            },
            type: {
              label: 'Type',
              description: 'Specifies the implementation type of the Data Source',
              type: 'string',
              required: true,
              order: 0
            },
            filters: {
              label: 'Filters',
              description: 'Optional, but if provided, specifies name-value pairs used to filter the data source\'s result set. Each key specifies a column in the data source, and the value specifies either a single value (string) or a set of values (array of strings). Only rows which have the specifies value(s) will be permitted',
              type: 'hash',
              inlineJsKey: true,
              inlineJsValue: true,
              required: false,
              defaultHidden: true,
              order: 101
            },
            sortBy: {
              label: 'Sort By',
              description: 'Optional, specifies the field(s) to sort the data by. If the value is a string, it will sort by that single field. If it is an array of strings, multiple fields will be used to sort, with left-to-right priority. The column name can be prefixed with a + or a - sign to indicate the direction or sort. + is ascending, while - is descending. The default sort direction is ascending, so the + sign does not need to be used. If this property is omitted, the original sort order of the data will be used.',
              type: 'string[]',
              inlineJs: true,
              required: false,
              placeholder: 'Column name',
              defaultHidden: true,
              order: 102
            },
            preload: {
              label: 'Preload',
              description: 'By default, each Data Source is loaded only when it is used, e.g. when a Widget consuming it is rendered. Setting this true causes Cyclotron to load the Data Source when the Dashboard is initialized.',
              type: 'boolean',
              inlineJs: false,
              required: false,
              "default": false,
              defaultHidden: true,
              order: 103
            },
            deferred: {
              label: 'Deferred',
              description: 'Prevents execution of the data source until execute() is manually called on the Data Source. This should only be used when using custom JavaScript to execute this Data Source, otherwise the Data Source will never run.',
              type: 'boolean',
              inlineJs: false,
              required: false,
              "default": false,
              defaultHidden: true,
              order: 103
            },
            errorHandler: {
              label: 'Error Handler',
              description: 'Specifies an optional JavaScript function that is called if an errors occurs. It can return a different or modified error message. If this value is not an JavaScript function, it will be ignored.',
              placeholder: 'JavaScript Function',
              type: 'editor',
              editorMode: 'javascript',
              required: false,
              defaultHidden: true,
              order: 104
            }
          },
          options: {
            cloudwatch: {
              value: 'cloudwatch',
              label: 'CloudWatch',
              message: 'Amazon CloudWatch monitors operational and performance metrics for your AWS cloud resources and applications. Refer to the <a href="http://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/Welcome.html" target="_blank">API Documentation</a> for information on configuring the available options.',
              icon: 'fa-cloud-download',
              properties: {
                url: {
                  label: 'URL',
                  description: 'Specifies the Amazon CloudWatch Endpoint for the desired region, e.g. "monitoring.us-west-2.amazonaws.com".',
                  placeholder: 'CloudWatch Endpoint',
                  type: 'url',
                  inlineJs: true,
                  inlineEncryption: true,
                  required: true,
                  order: 10
                },
                awsCredentials: {
                  label: 'AWS Credentials',
                  description: 'AWS IAM signing credentials for making authenticated requests.  If set, the request will be signed before it is sent.',
                  type: 'propertyset',
                  required: true,
                  order: 12,
                  properties: {
                    accessKeyId: {
                      label: 'Access Key Id',
                      description: 'AWS access key id',
                      type: 'string',
                      placeholder: 'Access Key Id',
                      inlineJs: true,
                      inlineEncryption: true,
                      order: 1
                    },
                    secretAccessKey: {
                      label: 'Secret Access Key',
                      description: 'AWS sercet access key',
                      type: 'string',
                      placeholder: 'Secret Access Key',
                      inlineJs: true,
                      inlineEncryption: true,
                      order: 2
                    }
                  }
                },
                parameters: {
                  label: 'CloudWatch Parameters',
                  description: 'Set of parameters for the CloudWatch API.',
                  type: 'propertyset',
                  required: true,
                  order: 13,
                  properties: {
                    Action: {
                      label: 'Action',
                      description: 'Specifies one of the CloudWatch actions.',
                      type: 'string',
                      "default": 'auto',
                      inlineJs: true,
                      options: {
                        ListMetrics: {
                          value: 'ListMetrics'
                        },
                        GetMetricStatistics: {
                          value: 'GetMetricStatistics'
                        }
                      },
                      required: true,
                      order: 1
                    },
                    Namespace: {
                      label: 'Namespace',
                      description: 'The namespace to filter against.',
                      type: 'string',
                      inlineJs: true,
                      required: false,
                      order: 2
                    },
                    MeasureName: {
                      label: 'Metric Name',
                      description: 'The name of the metric to filter against.',
                      type: 'string',
                      inlineJs: true,
                      required: false,
                      order: 3
                    },
                    Dimensions: {
                      label: 'Dimensions',
                      description: 'Optional; a list of Dimension key/values to filter against.',
                      type: 'hash',
                      required: false,
                      inlineJsValue: true,
                      inlineEncryption: true,
                      order: 4
                    },
                    Statistics: {
                      label: 'Statistics',
                      description: 'Specifies one or more Statistics to return.',
                      type: 'string[]',
                      inlineJs: true,
                      options: {
                        SampleCount: {
                          value: 'SampleCount'
                        },
                        Average: {
                          value: 'Average'
                        },
                        Sum: {
                          value: 'Sum'
                        },
                        Minimum: {
                          value: 'Minimum'
                        },
                        Maximum: {
                          value: 'Maximum'
                        }
                      },
                      required: true,
                      order: 5
                    },
                    Period: {
                      label: 'Period',
                      description: 'The granularity, in seconds, of the returned datapoints. A Period can be as short as one minute (60 seconds) or as long as one day (86,400 seconds), and must be a multiple of 60.',
                      type: 'integer',
                      "default": 60,
                      required: false,
                      placeholder: 'Number of Seconds',
                      order: 6
                    },
                    StartTime: {
                      label: 'Start Time',
                      description: 'The date/time of the first datapoint to return. The time stamp must be in ISO 8601 UTC format (e.g., 2014-09-03T23:00:00Z).',
                      type: 'string',
                      inlineJs: true,
                      required: false,
                      order: 8
                    },
                    EndTime: {
                      label: 'End Time',
                      description: 'The date/time of the last datapoint to return. The time stamp must be in ISO 8601 UTC format (e.g., 2014-09-03T23:00:00Z).',
                      type: 'string',
                      inlineJs: true,
                      required: false,
                      order: 9
                    }
                  }
                },
                refresh: {
                  label: 'Auto-Refresh',
                  description: 'Optional; specifies the number of seconds after which the Data Source reloads',
                  type: 'integer',
                  required: false,
                  placeholder: 'Number of Seconds',
                  order: 15
                },
                preProcessor: {
                  label: 'Pre-Processor',
                  description: 'Specifies an optional JavaScript function that can inspect and modify the Data Source properties before it is executed. This method will be called before the Data Source is executed, and passed the Data Source object as an argument. This object can be modified, or a new/modified object returned. If this value is not an JavaScript function, it will be ignored.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: false,
                  defaultHidden: true,
                  order: 16
                },
                postProcessor: {
                  label: 'Post-Processor',
                  description: 'Specifies an optional JavaScript function that can inspect and modify the result before it is sent to the Widgets. If this value is not an JavaScript function, it will be ignored.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: false,
                  order: 17
                },
                proxy: {
                  label: 'Proxy Server',
                  description: 'Specifies which Proxy server to route the requests through. If omitted, the default proxy sever will be used.',
                  type: 'url',
                  inlineJs: true,
                  required: false,
                  defaultHidden: true,
                  order: 11
                }
              }
            },
            cyclotronData: {
              value: 'cyclotronData',
              label: 'CyclotronData',
              icon: 'fa-cloud-download',
              message: 'Cyclotron has built-in support for a limited amount of data storage using uniquely-named buckets.  Refer to to the Documentation for more details.',
              properties: {
                key: {
                  label: 'Bucket Key',
                  description: 'Specifies the unique key to a Cyclotron Data bucket.',
                  placeholder: 'Bucket Key',
                  type: 'string',
                  inlineJs: true,
                  required: true,
                  order: 10
                },
                refresh: {
                  label: 'Auto-Refresh',
                  description: 'Optional; specifies the number of seconds after which the Data Source reloads',
                  type: 'integer',
                  required: false,
                  placeholder: 'Number of Seconds',
                  order: 14
                },
                preProcessor: {
                  label: 'Pre-Processor',
                  description: 'Specifies an optional JavaScript function that can inspect and modify the Data Source properties before it is executed. This method will be called before the Data Source is executed, and passed the Data Source object as an argument. This object can be modified, or a new/modified object returned. If this value is not an JavaScript function, it will be ignored.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: false,
                  defaultHidden: true,
                  order: 15
                },
                postProcessor: {
                  label: 'Post-Processor',
                  description: 'Specifies an optional JavaScript function that can inspect and modify the result before it is sent to the Widgets. If this value is not an JavaScript function, it will be ignored.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: false,
                  order: 16
                },
                url: {
                  label: 'Cyclotron Server',
                  description: 'Specifies which Cyclotron server to request data from. If omitted, the default sever will be used.',
                  type: 'url',
                  inlineJs: true,
                  required: false,
                  defaultHidden: true,
                  order: 11
                }
              }
            },
            elasticsearch: {
              value: 'elasticsearch',
              label: 'Elasticsearch',
              icon: 'fa-cloud-download',
              properties: {
                url: {
                  label: 'URL',
                  description: 'Specifies the Elasticsearch endpoint.',
                  placeholder: 'Elasticsearch URL',
                  type: 'url',
                  inlineJs: true,
                  inlineEncryption: true,
                  required: true,
                  order: 10
                },
                index: {
                  label: 'Index',
                  description: 'Specifies the name of the Elasticsearch index to query.',
                  type: 'string',
                  inlineJs: true,
                  inlineEncryption: true,
                  required: true,
                  order: 12
                },
                method: {
                  label: 'API Name',
                  description: 'Indicates which Elasticsearch API method to use; defaults to "_search".',
                  type: 'string',
                  inlineJs: true,
                  inlineEncryption: true,
                  defaultHidden: true,
                  "default": '_search',
                  required: false,
                  order: 13
                },
                request: {
                  label: 'Elasticsearch Request',
                  description: 'Specifies the Elasticsearch JSON request.',
                  placeholder: 'JSON',
                  type: 'editor',
                  editorMode: 'json',
                  inlineJs: true,
                  inlineEncryption: true,
                  required: true,
                  order: 14
                },
                responseAdapter: {
                  label: 'Response Adapter',
                  description: 'Determines how the Elasticsearch response will be converted to Cyclotron\'s data format.  Defaults to "auto".',
                  type: 'string',
                  "default": 'auto',
                  inlineJs: true,
                  options: {
                    'Auto': {
                      value: 'auto'
                    },
                    'Hits': {
                      value: 'hits'
                    },
                    'Aggregations': {
                      value: 'aggregations'
                    },
                    'Raw': {
                      value: 'raw'
                    }
                  },
                  required: false,
                  order: 15
                },
                awsCredentials: {
                  label: 'AWS Credentials',
                  description: 'Optional AWS IAM signing credentials for making authenticated requests.  If set, the request will be signed before it is sent.',
                  type: 'propertyset',
                  required: false,
                  defaultHidden: true,
                  order: 16,
                  properties: {
                    accessKeyId: {
                      label: 'Access Key Id',
                      description: 'AWS access key id',
                      type: 'string',
                      placeholder: 'Access Key Id',
                      inlineJs: true,
                      inlineEncryption: true,
                      order: 1
                    },
                    secretAccessKey: {
                      label: 'Secret Access Key',
                      description: 'AWS sercet access key',
                      type: 'string',
                      placeholder: 'Secret Access Key',
                      inlineJs: true,
                      inlineEncryption: true,
                      order: 2
                    }
                  }
                },
                refresh: {
                  label: 'Auto-Refresh',
                  description: 'Optional; specifies the number of seconds after which the Data Source reloads',
                  type: 'integer',
                  required: false,
                  placeholder: 'Number of Seconds',
                  order: 20
                },
                preProcessor: {
                  label: 'Pre-Processor',
                  description: 'Specifies an optional JavaScript function that can inspect and modify the Data Source properties before it is executed. This method will be called before the Data Source is executed, and passed the Data Source object as an argument. This object can be modified, or a new/modified object returned. If this value is not an JavaScript function, it will be ignored.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: false,
                  defaultHidden: true,
                  order: 21
                },
                postProcessor: {
                  label: 'Post-Processor',
                  description: 'Specifies an optional JavaScript function that can inspect and modify the result before it is sent to the Widgets. If this value is not an JavaScript function, it will be ignored.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: false,
                  order: 22
                },
                proxy: {
                  label: 'Proxy Server',
                  description: 'Specifies which Proxy server to route the requests through. If omitted, the default proxy sever will be used.',
                  type: 'url',
                  inlineJs: true,
                  required: false,
                  defaultHidden: true,
                  order: 23
                }
              }
            },
            graphite: {
              value: 'graphite',
              label: 'Graphite',
              icon: 'fa-cloud-download',
              message: 'The Graphite Data Source connects to any <a href="http://graphite.readthedocs.org/" target="_blank">Graphite<a> server to load time-series metrics via the Render api. For more details on usage, refer to the Graphite <a href="http://graphite.readthedocs.org/en/latest/render_api.html" target="_blank">documentation</a>.',
              properties: {
                url: {
                  label: 'URL',
                  description: 'The Graphite server',
                  placeholder: 'Graphite Server URL or IP',
                  type: 'url',
                  inlineJs: true,
                  inlineEncryption: true,
                  required: true,
                  order: 10
                },
                targets: {
                  label: 'Targets',
                  description: 'One or more Graphite metrics, optionally with metrics.',
                  type: 'string[]',
                  inlineJs: true,
                  inlineEncryption: true,
                  required: true,
                  order: 11
                },
                from: {
                  label: 'From',
                  description: 'Specifies the absolute or relative beginning of the time period to retrieve. If omitted, it defaults to 24 hours ago (per Graphite).',
                  placeholder: 'Start Time',
                  type: 'string',
                  inlineJs: true,
                  inlineEncryption: true,
                  required: false,
                  order: 12
                },
                until: {
                  label: 'Until',
                  description: 'Specifies the absolute or relative end of the time period to retrieve. If omitted, it defaults now (per Graphite).',
                  placeholder: 'End Time',
                  type: 'string',
                  inlineJs: true,
                  inlineEncryption: true,
                  required: false,
                  order: 13
                },
                refresh: {
                  label: 'Auto-Refresh',
                  description: 'Optional; specifies the number of seconds after which the Data Source reloads',
                  type: 'integer',
                  required: false,
                  placeholder: 'Number of Seconds',
                  order: 14
                },
                preProcessor: {
                  label: 'Pre-Processor',
                  description: 'Specifies an optional JavaScript function that can inspect and modify the Data Source properties before it is executed. This method will be called before the Data Source is executed, and passed the Data Source object as an argument. This object can be modified, or a new/modified object returned. If this value is not an JavaScript function, it will be ignored.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: false,
                  defaultHidden: true,
                  order: 15
                },
                postProcessor: {
                  label: 'Post-Processor',
                  description: 'Specifies an optional JavaScript function that can inspect and modify the Graphite result before it is sent to the Widgets. If this value is not an JavaScript function, it will be ignored.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: false,
                  order: 16
                },
                proxy: {
                  label: 'Proxy Server',
                  description: 'Specifies which Proxy server to route the requests through. If omitted, the default proxy sever will be used.',
                  type: 'url',
                  inlineJs: true,
                  required: false,
                  defaultHidden: true,
                  order: 11
                }
              }
            },
            influxdb: {
              value: 'influxdb',
              label: 'InfluxDB',
              icon: 'fa-cloud-download',
              message: '<a href="https://www.influxdata.com/time-series-platform/influxdb/" target="_blank">InfluxDB</a> is an open source time series database built from the ground up to handle high write and query loads.',
              properties: {
                url: {
                  label: 'URL',
                  description: 'The InfluxDB server',
                  placeholder: 'InfluxDB Server URL or IP',
                  type: 'url',
                  inlineJs: true,
                  required: true,
                  order: 10
                },
                database: {
                  label: 'Database',
                  description: 'Specifies the target InfluxDB database for the query.',
                  placeholder: 'Database',
                  type: 'string',
                  required: true,
                  inlineJs: true,
                  inlineEncryption: true,
                  required: false,
                  order: 11
                },
                query: {
                  label: 'Query',
                  description: 'An InfluxQL query.',
                  type: 'string',
                  inlineJs: true,
                  inlineEncryption: true,
                  required: true,
                  order: 11
                },
                precision: {
                  label: 'Precision',
                  description: 'Overrides the default timestamp precision.',
                  type: 'string',
                  "default": 'ms',
                  inlineJs: true,
                  options: {
                    h: {
                      value: 'h'
                    },
                    m: {
                      value: 'm'
                    },
                    s: {
                      value: 's'
                    },
                    ms: {
                      value: 'ms'
                    },
                    u: {
                      value: 'u'
                    },
                    ns: {
                      value: 'ns'
                    }
                  },
                  order: 11
                },
                username: {
                  label: 'Username',
                  description: 'Optional; username for authentication, if enabled.',
                  type: 'string',
                  inlineJs: true,
                  inlineEncryption: true,
                  order: 15
                },
                password: {
                  label: 'Password',
                  description: 'Optional; password for authentication, if enabled.',
                  type: 'string',
                  inputType: 'password',
                  inlineJs: true,
                  inlineEncryption: true,
                  order: 16
                },
                refresh: {
                  label: 'Auto-Refresh',
                  description: 'Optional; specifies the number of seconds after which the Data Source reloads',
                  type: 'integer',
                  required: false,
                  placeholder: 'Number of Seconds',
                  order: 21
                },
                preProcessor: {
                  label: 'Pre-Processor',
                  description: 'Specifies an optional JavaScript function that can inspect and modify the Data Source properties before it is executed. This method will be called before the Data Source is executed, and passed the Data Source object as an argument. This object can be modified, or a new/modified object returned. If this value is not an JavaScript function, it will be ignored.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: false,
                  defaultHidden: true,
                  order: 22
                },
                postProcessor: {
                  label: 'Post-Processor',
                  description: 'Specifies an optional JavaScript function that can inspect and modify the Graphite result before it is sent to the Widgets. If this value is not an JavaScript function, it will be ignored.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: false,
                  order: 23
                },
                proxy: {
                  label: 'Proxy Server',
                  description: 'Specifies which Proxy server to route the requests through. If omitted, the default proxy sever will be used.',
                  type: 'url',
                  inlineJs: true,
                  required: false,
                  defaultHidden: true,
                  order: 11
                }
              }
            },
            javascript: {
              value: 'javascript',
              label: 'JavaScript',
              icon: 'fa-cloud-download',
              message: 'The JavaScript Data Source allows custom JavaScript to be used to load or generate a Data Source.',
              properties: {
                processor: {
                  label: 'Processor',
                  description: 'Specifies a JavaScript function used to provide data for the Data Source, either by directly returning a data set, or resolving a promise asynchronously. The function is called with an optional promise which can be used for this purpose.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: true,
                  order: 10
                },
                refresh: {
                  label: 'Auto-Refresh',
                  description: 'Optional; specifies the number of seconds after which the Data Source reloads',
                  type: 'integer',
                  required: false,
                  placeholder: 'Number of Seconds',
                  order: 11
                },
                preProcessor: {
                  label: 'Pre-Processor',
                  description: 'Specifies an optional JavaScript function that can inspect and modify the Data Source properties before it is executed. This method will be called before the Data Source is executed, and passed the Data Source object as an argument. This object can be modified, or a new/modified object returned. If this value is not an JavaScript function, it will be ignored.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: false,
                  defaultHidden: true,
                  order: 12
                },
                postProcessor: {
                  label: 'Post-Processor',
                  description: 'Specifies an optional JavaScript function that can inspect and modify the JavaScript result dataset before it is sent to the Widgets. If this value is not an JavaScript function, it will be ignored.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: false,
                  defaultHidden: true,
                  order: 13
                }
              }
            },
            json: {
              value: 'json',
              label: 'JSON',
              icon: 'fa-cloud-download',
              properties: {
                url: {
                  label: 'URL',
                  description: 'Specifies the JSON Web Service URL.',
                  placeholder: 'Web Service URL',
                  type: 'url',
                  inlineJs: true,
                  inlineEncryption: true,
                  required: true,
                  order: 10
                },
                queryParameters: {
                  label: 'Query Parameters',
                  description: 'Optional query parameters which are added to the URL. If there are already query parameters in the URL, these will be appended. The keys and values are both URL-encoded.',
                  type: 'hash',
                  required: false,
                  inlineJsKey: true,
                  inlineJsValue: true,
                  inlineEncryption: true,
                  defaultHidden: true,
                  order: 12
                },
                options: {
                  label: 'Options',
                  description: 'Optional request parameters that are passed to the library making the request.',
                  type: 'hash',
                  required: false,
                  inlineJsValue: true,
                  inlineEncryption: true,
                  defaultHidden: true,
                  order: 13
                },
                refresh: {
                  label: 'Auto-Refresh',
                  description: 'Optional; specifies the number of seconds after which the Data Source reloads',
                  type: 'integer',
                  required: false,
                  placeholder: 'Number of Seconds',
                  order: 14
                },
                preProcessor: {
                  label: 'Pre-Processor',
                  description: 'Specifies an optional JavaScript function that can inspect and modify the Data Source properties before it is executed. This method will be called before the Data Source is executed, and passed the Data Source object as an argument. This object can be modified, or a new/modified object returned. If this value is not an JavaScript function, it will be ignored.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: false,
                  defaultHidden: true,
                  order: 15
                },
                postProcessor: {
                  label: 'Post-Processor',
                  description: 'Specifies an optional JavaScript function that can inspect and modify the result before it is sent to the Widgets. If this value is not an JavaScript function, it will be ignored.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: false,
                  order: 16
                },
                proxy: {
                  label: 'Proxy Server',
                  description: 'Specifies which Proxy server to route the requests through. If omitted, the default proxy sever will be used.',
                  type: 'url',
                  inlineJs: true,
                  required: false,
                  defaultHidden: true,
                  order: 11
                },
                awsCredentials: {
                  label: 'AWS Credentials',
                  description: 'Optional AWS IAM signing credentials for making authenticated requests.  If set, the request will be signed before it is sent.',
                  type: 'propertyset',
                  required: false,
                  defaultHidden: true,
                  order: 17,
                  properties: {
                    accessKeyId: {
                      label: 'Access Key Id',
                      description: 'AWS access key id',
                      type: 'string',
                      placeholder: 'Access Key Id',
                      inlineJs: true,
                      inlineEncryption: true,
                      order: 1
                    },
                    secretAccessKey: {
                      label: 'Secret Access Key',
                      description: 'AWS sercet access key',
                      type: 'string',
                      placeholder: 'Secret Access Key',
                      inlineJs: true,
                      inlineEncryption: true,
                      order: 2
                    }
                  }
                }
              }
            },
            mock: {
              value: 'mock',
              label: 'Mock',
              icon: 'fa-cloud-download',
              message: 'The Mock Data Source generates sample data for testing a dashboard.',
              properties: {
                format: {
                  label: 'Format',
                  description: 'Selects the format of the mock data from these possible values: ["object", "pie", "ducati"]. Defaults to "object".',
                  type: 'string',
                  required: false,
                  "default": 'object',
                  options: {
                    object: {
                      value: 'object'
                    },
                    pie: {
                      value: 'pie'
                    },
                    large: {
                      value: 'large'
                    },
                    ducati: {
                      value: 'ducati'
                    }
                  },
                  order: 10
                },
                refresh: {
                  label: 'Refresh',
                  description: 'Optional; specifies the number of seconds after which the Data Source reloads',
                  type: 'integer',
                  required: false,
                  placeholder: 'Number of Seconds',
                  order: 11
                }
              }
            },
            splunk: {
              value: 'splunk',
              label: 'Splunk',
              icon: 'fa-cloud-download',
              properties: {
                query: {
                  label: 'Query',
                  description: 'Splunk query',
                  placeholder: 'Splunk query',
                  type: 'textarea',
                  required: true,
                  order: 10
                },
                earliest: {
                  label: 'Earliest Time',
                  description: 'Sets the earliest (inclusive), respectively, time bounds for the search. The time string can be either a UTC time (with fractional seconds), a relative time specifier (to now) or a formatted time string.',
                  placeholder: 'Earliest Time',
                  type: 'string',
                  inlineJs: true,
                  inlineEncryption: true,
                  required: false,
                  order: 11
                },
                latest: {
                  label: 'Latest Time',
                  description: 'Sets the latest (exclusive), respectively, time bounds for the search. The time string can be either a UTC time (with fractional seconds), a relative time specifier (to now) or a formatted time string.',
                  placeholder: 'Latest Time',
                  type: 'string',
                  inlineJs: true,
                  inlineEncryption: true,
                  required: false,
                  order: 12
                },
                username: {
                  label: 'Username',
                  description: 'Username to authenticate with Splunk',
                  type: 'string',
                  required: true,
                  inlineJs: true,
                  inlineEncryption: true,
                  order: 13
                },
                password: {
                  label: 'Password',
                  description: 'Password to authenticate with Splunk',
                  type: 'string',
                  inputType: 'password',
                  required: true,
                  inlineJs: true,
                  inlineEncryption: true,
                  order: 14
                },
                host: {
                  label: 'Host',
                  description: 'Splunk API host name',
                  placeholder: 'Splunk API host name',
                  type: 'string',
                  inputType: 'string',
                  required: false,
                  defaultHidden: false,
                  order: 15
                },
                url: {
                  label: 'URL',
                  description: 'The Splunk API Search URL',
                  placeholder: 'Splunk API Search URL',
                  type: 'url',
                  inlineJs: true,
                  inlineEncryption: true,
                  "default": 'https://#{host}:8089/services/search/jobs/export',
                  defaultHidden: true,
                  required: false,
                  order: 16
                },
                refresh: {
                  label: 'Refresh',
                  description: 'Optional; specifies the number of seconds after which the Data Source reloads',
                  type: 'integer',
                  required: false,
                  placeholder: 'Number of Seconds',
                  order: 17
                },
                preProcessor: {
                  label: 'Pre-Processor',
                  description: 'Specifies an optional JavaScript function that can inspect and modify the Data Source properties before it is executed. This method will be called before the Data Source is executed, and passed the Data Source object as an argument. This object can be modified, or a new/modified object returned. If this value is not an JavaScript function, it will be ignored.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: false,
                  defaultHidden: true,
                  order: 18
                },
                postProcessor: {
                  label: 'Post-Processor',
                  description: 'Specifies an optional JavaScript function that can inspect and modify the Splunk result dataset before it is sent to the Widgets. If this value is not an JavaScript function, it will be ignored.',
                  placeholder: 'JavaScript Function',
                  type: 'editor',
                  editorMode: 'javascript',
                  required: false,
                  defaultHidden: true,
                  order: 19
                },
                proxy: {
                  label: 'Proxy Server',
                  description: 'Specifies which Proxy server to route the requests through. This is required to use encrypted strings within the Data Source properties. If omitted, the default proxy sever will be used.',
                  type: 'url',
                  inlineJs: true,
                  required: false,
                  defaultHidden: true,
                  order: 20
                }
              }
            }
          }
        },
        parameters: {
          label: 'Parameters',
          description: 'A list of Parameters that can be used to configure the Dashboard.',
          type: 'propertyset[]',
          "default": [],
          required: false,
          properties: {
            name: {
              label: 'Name',
              description: 'The name used to set or reference this Parameter.',
              type: 'string',
              required: true,
              placeholder: 'Parameter Name',
              order: 0
            },
            defaultValue: {
              label: 'Default Value',
              description: 'The value used if the Parameter is not set when opening the Dashboard.',
              type: 'string',
              placeholder: 'Default Value',
              required: false,
              inlineJs: true,
              order: 1
            },
            showInUrl: {
              label: 'Show in URL',
              description: 'Determines whether or not the Parameter is displayed in the query string of the Dashboard URL.',
              type: 'boolean',
              "default": true,
              required: false,
              order: 2
            },
            editInHeader: {
              label: 'Editable in Header',
              description: 'If true, the Parameter will be displayed and configurable in the Parameter section of the Header Widget (if used).',
              type: 'boolean',
              "default": false,
              required: false,
              order: 3
            },
            persistent: {
              label: 'Persistent',
              description: 'If true, the value of this Parameter will be persisted in the user\'s browser across multiple sessions.',
              type: 'boolean',
              "default": false,
              required: false,
              order: 4
            },
            changeEvent: {
              label: 'Change Event',
              description: 'This event occurs when the Parameter value is modified. It does not fire when the Dashboard is being initialized. Expects a JavaScript function in the form function(parameterName, newValue, oldValue).',
              type: 'editor',
              editorMode: 'javascript',
              required: false,
              defaultHidden: true,
              order: 10
            },
            editing: {
              label: 'Editing',
              description: 'Configuration for how this Parameter can be edited in the Dashboard.',
              type: 'propertyset',
              required: false,
              "default": {},
              defaultHidden: true,
              order: 15,
              properties: {
                displayName: {
                  label: 'Display Name',
                  description: 'The display name used for this Parameter.',
                  type: 'string',
                  required: false,
                  placeholder: 'Display Name',
                  order: 1
                },
                editorType: {
                  label: 'Editor Type',
                  description: 'Determines the type of editor used to configured this Parameter (e.g. in the Header Widget).',
                  type: 'string',
                  required: false,
                  "default": 'textbox',
                  order: 2,
                  options: {
                    textbox: {
                      value: 'textbox'
                    },
                    dropdown: {
                      value: 'dropdown'
                    },
                    links: {
                      value: 'links'
                    },
                    checkbox: {
                      value: 'checkbox'
                    },
                    datetime: {
                      value: 'datetime'
                    },
                    date: {
                      value: 'date'
                    },
                    time: {
                      value: 'time'
                    }
                  }
                },
                dataSource: {
                  label: 'Data Source',
                  description: 'Optionally specifies a Data Source providing dropdown options for this Parameter.',
                  placeholder: 'Data Source name',
                  type: 'string',
                  required: false,
                  options: datasourceOptions,
                  order: 4
                },
                datetimeFormat: {
                  label: 'Date/Time Format',
                  description: 'The Moment.js-compatible date/time format string used to read/write datetimes to this Parameter. Only used if the editor type is "datetime", "date", or "time".  Defaults to an ISO 8601 format.',
                  type: 'string',
                  required: false,
                  placeholder: 'Format',
                  defaultHidden: true,
                  order: 5
                }
              }
            }
          },
          sample: {
            name: '',
            defaultValue: ''
          }
        },
        scripts: {
          label: 'Scripts',
          description: 'Defines a list of inline JavaScript or external JavaScript URIs that are loaded when the Dashboard initializes.',
          type: 'propertyset[]',
          "default": [],
          required: false,
          properties: {
            name: {
              label: 'Name',
              description: 'Display name of the script',
              type: 'string',
              placeholder: 'Name',
              required: false,
              order: 0
            },
            path: {
              label: 'Path',
              description: 'URL to a JavaScript file, to be loaded along with the Dashboard',
              type: 'url',
              placeholder: 'JavaScript file URL',
              required: false,
              order: 1
            },
            text: {
              label: 'JavaScript Text',
              description: 'Inline JavaScript to be run when the Dashboard is loaded',
              type: 'editor',
              editorMode: 'javascript',
              placeholder: 'Inline JavaScript',
              required: false,
              order: 2
            },
            singleLoad: {
              label: 'Single-Load',
              description: 'If true, this Script will only be loaded once when the Dashboard is loaded. Otherwise, it will be rerun every time the Dashboard internally refreshes. Scripts loaded from a path are always treated as single-load, and this property is ignored.',
              type: 'boolean',
              required: false,
              "default": false,
              order: 3
            }
          },
          sample: {
            text: ''
          }
        },
        styles: {
          label: 'Styles',
          description: 'Defines a list of inline CSS or external CSS URIs that are loaded when the Dashboard initializes.',
          type: 'propertyset[]',
          "default": [],
          required: false,
          properties: {
            name: {
              label: 'Name',
              description: 'Display name of the style',
              type: 'string',
              placeholder: 'Name',
              required: false,
              order: 0
            },
            path: {
              label: 'Path',
              description: 'URL to a CSS file, to be loaded along with the Dashboard',
              type: 'url',
              placeholder: 'CSS file URL',
              required: false,
              order: 0
            },
            text: {
              label: 'CSS Text',
              description: 'Inline CSS to be run when the Dashboard is loaded',
              type: 'editor',
              editorMode: 'css',
              placeholder: 'Inline CSS',
              required: false,
              order: 1
            }
          },
          sample: {
            text: ''
          }
        }
      },
      controls: {
        duration: 1000,
        hitPaddingX: 60,
        hitPaddingY: 50
      },
      sample: {
        name: '',
        sidebar: {
          showDashboardSidebar: true
        },
        pages: []
      }
    },
    dashboardSidebar: {
      footer: {
        logos: [
          {
            title: 'Cyclotron',
            src: '/img/favicon32.png',
            href: '/'
          }
        ]
      }
    },
    help: [
      {
        name: 'About',
        path: '/partials/help/about.html',
        tags: ['about', 'terminology', 'features'],
        children: [
          {
            name: 'Quick Start',
            path: '/partials/help/quickstart.html',
            tags: ['help', 'creating', 'tags', 'theme', 'revisions', 'preview', 'data sources', 'pages', 'layout', 'widgets']
          }, {
            name: 'JSON',
            path: '/partials/help/json.html',
            tags: ['json']
          }, {
            name: 'Examples',
            path: '/partials/help/examples.html',
            tags: ['examples', 'cyclotron-examples']
          }, {
            name: 'Browser Compatibility',
            path: '/partials/help/browserCompat.html',
            tags: ['browser', 'compatibility', 'firefox', 'chrome', 'internet explorer', 'ie', 'safari', 'browsercheck']
          }, {
            name: 'Permissions',
            path: '/partials/help/permissions.html',
            tags: ['permissions', 'edit permission', 'view permission', 'editors', 'viewers', 'restricted', 'login', 'rest', 'api']
          }, {
            name: 'Analytics',
            path: '/partials/help/analytics.html',
            tags: ['analytics', 'pageviews', 'visits', 'metrics']
          }, {
            name: 'Encrypted Strings',
            path: '/partials/help/encryptedStrings.html',
            tags: ['encryption', 'encrypted', '!{', 'decrypt', 'encrypt']
          }, {
            name: 'JavaScript API',
            path: '/partials/help/javascriptApi.html',
            tags: ['javascript', 'api', 'scripting']
          }, {
            name: 'CyclotronData',
            path: '/partials/help/cyclotrondata.html',
            tags: ['cyclotrondata', 'data', 'storage', 'bucket', 'api']
          }, {
            name: '3rd Party Libraries',
            path: '/partials/help/3rdparty.html',
            tags: ['libraries', 'jquery', 'moment', 'lodash', 'angular', 'numeral', 'localforage', 'uri', 'bootstrap', 'c3.js', 'd3.js', 'font awesome', 'highcharts', 'masonry', 'metricsgraphics', 'select2', 'spin.js']
          }, {
            name: 'Hotkeys',
            path: '/partials/help/hotkeys.html',
            tags: ['hotkeys', 'keys', 'shortcuts']
          }, {
            name: 'API',
            path: '/partials/help/api.html',
            tags: ['api', 'rest', 'service']
          }
        ]
      }, {
        name: 'Dashboards',
        path: '/partials/help/dashboards.html',
        tags: ['dashboards', 'pages', 'dataSources', 'scripts', 'parameters'],
        children: [
          {
            name: 'Pages',
            path: '/partials/help/pages.html',
            tags: ['pages', 'widgets']
          }, {
            name: 'Layout',
            path: '/partials/help/layout.html',
            tags: ['layout', 'grid', 'mobile', 'scrolling', 'position', 'absolute']
          }, {
            name: 'Parameters',
            path: '/partials/help/parameters.html',
            tags: ['parameters']
          }, {
            name: 'Scripts',
            path: '/partials/help/scripts.html',
            tags: ['scripts', 'javascript']
          }, {
            name: 'Styles',
            path: '/partials/help/styles.html',
            tags: ['styles', 'css']
          }
        ]
      }, {
        name: 'Data Sources',
        path: '/partials/help/dataSources.html',
        tags: ['data sources', 'dataSources', 'tabular', 'post-processor', 'post processor', 'pre-processor', 'pre processor']
      }, {
        name: 'Widgets',
        path: '/partials/help/widgets.html',
        tags: ['widgets']
      }
    ],
    exportFormats: [
      {
        label: 'PDF',
        value: 'pdf'
      }
    ],
    page: {
      sample: {
        frequency: 1,
        layout: {
          gridColumns: 2,
          gridRows: 2
        },
        widgets: []
      }
    },
    widgets: {
      annotationChart: {
        name: 'annotationChart',
        label: 'Annotation Chart',
        icon: 'fa-bar-chart-o',
        properties: {
          dataSource: {
            label: 'Data Source',
            description: 'The name of the Data Source providing data for this Widget.',
            placeholder: 'Data Source name',
            type: 'string',
            required: true,
            options: datasourceOptions,
            order: 10
          },
          xAxis: {
            label: 'X-Axis',
            description: 'Configuration of the X-axis.',
            type: 'propertyset',
            required: true,
            properties: {
              column: {
                label: 'Column Name',
                description: 'Name of the column in the Data Source used for the x-axis.',
                placeholder: 'Column Name',
                inlineJs: true,
                type: 'string',
                order: 1
              },
              format: {
                label: 'Format',
                description: 'Specifies which format the incoming datetime data is in.',
                type: 'string',
                options: {
                  date: {
                    value: 'date'
                  },
                  epoch: {
                    value: 'epoch'
                  },
                  epochmillis: {
                    value: 'epochmillis'
                  },
                  string: {
                    value: 'string'
                  }
                },
                order: 2
              },
              formatString: {
                label: 'Format String',
                description: 'Used with the String format to specify how the string should be parsed.',
                type: 'string',
                order: 3
              }
            },
            order: 11
          },
          series: {
            label: 'Series',
            singleLabel: 'series',
            description: 'One or more series to display in the annotation chart.',
            type: 'propertyset[]',
            required: true,
            "default": [],
            order: 12,
            properties: {
              column: {
                label: 'Column Name',
                description: 'Name of the column in the Data Source to use as the y-axis value for this series.',
                placeholder: 'Column Name',
                inlineJs: true,
                type: 'string',
                order: 1
              },
              label: {
                label: 'Label',
                description: 'Display label for the series; if omitted, the column name will be used.',
                placeholder: 'Label',
                inlineJs: true,
                type: 'string',
                order: 2
              },
              annotationTitleColumn: {
                label: 'Annotation Title Column Name',
                description: 'Name of the column in the Data Source to use as the title of annotations corresponding to each point.',
                placeholder: 'Column Name',
                inlineJs: true,
                type: 'string',
                order: 3
              },
              annotationTextColumn: {
                label: 'Annotation Text Column Name',
                description: 'Name of the column in the Data Source to use as the text of annotations corresponding to each point.',
                placeholder: 'Column Name',
                inlineJs: true,
                type: 'string',
                order: 4
              },
              secondaryAxis: {
                label: 'Secondary Axis',
                description: 'If true, places the series on a second axis on the left of the chart.',
                inlineJs: true,
                type: 'boolean',
                order: 5
              }
            }
          },
          options: {
            label: 'Options',
            description: 'Additional options for the Google Annotation chart.  Any supported option is allowed here.',
            type: 'propertyset',
            required: false,
            inlineJs: true,
            properties: {
              allValuesSuffix: {
                label: 'All Values Suffix',
                description: 'A suffix to be added to all values in the legend and tick labels in the vertical axes.',
                placeholder: 'Suffix',
                type: 'string',
                inlineJs: true,
                defaultHidden: true
              },
              annotationsWidth: {
                label: 'Annotations Width',
                description: 'The width (in percent) of the annotations area, out of the entire chart area. Must be a number in the range 5-80.',
                type: 'integer',
                inlineJs: true,
                defaultHidden: true
              },
              displayAnnotations: {
                label: 'Display Annotations',
                description: 'Controls whether annotations are displayed along with the chart.',
                type: 'boolean',
                inlineJs: true,
                "default": true,
                defaultHidden: true
              },
              displayAnnotationsFilter: {
                label: 'Display Annotations Filter',
                description: 'If set to true, the chart will display a filter control to filter annotations.',
                type: 'boolean',
                inlineJs: true,
                "default": false,
                defaultHidden: true
              },
              displayDateBarSeparator: {
                label: 'Display Date Bar Separator',
                description: 'If set to true, the chart will display a small bar separator ( | ) between the series values and the date in the legend.',
                type: 'boolean',
                inlineJs: true,
                "default": false,
                defaultHidden: true
              },
              displayLegendDots: {
                label: 'Display Legend Dots',
                description: 'If set to true, the chart will display dots next to the values in the legend text.',
                type: 'boolean',
                inlineJs: true,
                defaultHidden: true
              },
              displayLegendValues: {
                label: 'Display Legend Values',
                description: 'If set to true, the chart will display the highlighted values in the legend.',
                type: 'boolean',
                inlineJs: true,
                defaultHidden: true
              },
              displayRangeSelector: {
                label: 'Display Range Selector',
                description: 'If set to true, the chart will display the zoom range selection area (the area at the bottom of the chart).',
                type: 'boolean',
                inlineJs: true,
                defaultHidden: true
              },
              displayZoomButtons: {
                label: 'Display Zoom Buttons',
                description: 'If set to true, the chart will display the zoom buttons ("1d 5d 1m" etc).',
                type: 'boolean',
                inlineJs: true,
                defaultHidden: true
              },
              fill: {
                label: 'Fill',
                description: 'A number from 0—100 (inclusive) specifying the alpha of the fill below each line in the line graph. 100 means 100% opaque, and 0 means no fill at all. The fill color is the same color as the line above it.',
                type: 'integer',
                inlineJs: true,
                defaultHidden: true
              },
              focusTarget: {
                label: 'Focus Target',
                description: 'Determines whether mouse hover focuses on individual points, or is shared by all series.  Defaults to category, unless Annotation editing is enabled, which forces "datum".',
                type: 'string',
                inlineJs: true,
                defaultHidden: true,
                "default": 'category',
                options: {
                  datum: {
                    value: 'datum'
                  },
                  category: {
                    value: 'category'
                  }
                }
              },
              legendPosition: {
                label: 'Legend Position',
                description: 'Determines whether the legend is put on the same row as the zoom buttons, or a new row.',
                type: 'string',
                inlineJs: true,
                defaultHidden: true,
                options: {
                  sameRow: {
                    value: 'sameRow'
                  },
                  newRow: {
                    value: 'newRow'
                  }
                }
              },
              max: {
                label: 'Maximum',
                description: 'The maximum value to show on the Y-axis. If the maximum data point is less than this value, this setting will be ignored.',
                type: 'number',
                inlineJs: true,
                defaultHidden: true
              },
              min: {
                label: 'Minimum',
                description: 'The minimum value to show on the Y-axis. If the minimum data point is less than this value, this setting will be ignored.',
                type: 'number',
                inlineJs: true,
                defaultHidden: true
              },
              scaleFormat: {
                label: 'Scale Format',
                description: 'Number format to be used for the axis tick labels.  Format reference: https://developers.google.com/chart/interactive/docs/customizing_axes#number-formats.',
                placeholder: 'Format',
                type: 'string',
                inlineJs: true,
                defaultHidden: true
              },
              scaleType: {
                label: 'Scale Type',
                description: 'Sets the maximum and minimum values shown on the Y-axis.  Reference: https://developers.google.com/chart/interactive/docs/gallery/annotationchart.',
                type: 'string',
                inlineJs: true,
                defaultHidden: true,
                options: {
                  maximized: {
                    value: 'maximized'
                  },
                  fixed: {
                    value: 'fixed'
                  },
                  allmaximized: {
                    value: 'allmaximized'
                  },
                  allfixed: {
                    value: 'allfixed'
                  }
                }
              },
              thickness: {
                label: 'Thickness',
                description: 'A number from 0—10 (inclusive) specifying the thickness of the lines, where 0 is the thinnest.',
                placeholder: 'Thickness',
                type: 'integer',
                inlineJs: true,
                defaultHidden: true
              },
              zoomStartTime: {
                label: 'Zoom Start Time',
                description: 'Sets the initial start datetime of the selected zoom range. Should be provided as a JavaScript Date.',
                placeholder: 'Date Time',
                type: 'datetime',
                inlineJs: true,
                defaultHidden: true
              },
              zoomEndTime: {
                label: 'Zoom End Time',
                description: 'Sets the initial end datetime of the selected zoom range. Should be provided as a JavaScript Date.',
                placeholder: 'Date Time',
                type: 'datetime',
                inlineJs: true,
                defaultHidden: true
              }
            },
            order: 13
          },
          annotationEditing: {
            label: 'Built-In Annotation Editing',
            description: 'Optional, but if enabled, allows users to create new annotations for points on the chart.  Annotations are stored automatically within Cyclotron.',
            type: 'boolean',
            required: false,
            "default": false,
            order: 13
          },
          annotationKey: {
            label: 'Built-In Annotation Key',
            description: 'Provides a CyclotronData bucket key to be used for built-in annotation editing. This property is automatically initialized with a random UUID.',
            type: 'string',
            inlineJs: true,
            required: false,
            defaultHidden: true,
            order: 14
          },
          events: {
            label: 'Events',
            description: 'Optional event handlers for various events.',
            type: 'propertyset',
            required: false,
            defaultHidden: true,
            order: 15,
            properties: {
              rangechange: {
                label: 'Range Change Event',
                description: 'This event occurs when the user changes the range slider. The new endpoints are available as e.start and e.end.',
                type: 'editor',
                editorMode: 'javascript',
                required: false,
                order: 1
              }
            }
          },
          filters: {
            label: 'Filters',
            description: 'Optional, but if provided, specifies name-value pairs used to filter the data source\'s result set. Each key specifies a column in the data source, and the value specifies either a single value (string) or a set of values (array of strings). Only rows which have the specifies value(s) will be permitted.',
            type: 'hash',
            inlineJsKey: true,
            inlineJsValue: true,
            required: false,
            order: 20
          },
          sortBy: {
            label: 'Sort By',
            description: 'Optional, specifies the field(s) to sort the data by. If the value is a string, it will sort by that single field. If it is an array of strings, multiple fields will be used to sort, with left-to-right priority. The column name can be prefixed with a + or a - sign to indicate the direction or sort. + is ascending, while - is descending. The default sort direction is ascending, so the + sign does not need to be used. If this property is omitted, the original sort order of the data will be used.',
            type: 'string[]',
            inlineJs: true,
            required: false,
            placeholder: 'Column name',
            order: 20
          }
        },
        options: {
          displayAnnotations: true,
          chart: {
            focusTarget: 'category'
          }
        },
        sample: function() {
          return {
            annotationKey: uuid.v4()
          };
        },
        themes: {
          dark: {
            options: {
              dbackgroundColor: '#222222'
            }
          },
          darkmetro: {
            options: {
              dbackgroundColor: '#202020'
            }
          }
        }
      },
      chart: {
        name: 'chart',
        label: 'Chart',
        icon: 'fa-bar-chart-o',
        properties: {
          dataSource: {
            label: 'Data Source',
            description: 'The name of the Data Source providing data for this Widget.',
            placeholder: 'Data Source name',
            type: 'string',
            required: true,
            options: datasourceOptions,
            order: 10
          },
          drilldownDataSource: {
            label: 'Drilldown Data Source',
            description: 'The name of the Data Source providing drilldown data for this Widget.',
            placeholder: 'Data Source name',
            type: 'string',
            required: false,
            defaultHidden: true,
            options: datasourceOptions,
            order: 11
          },
          highchart: {
            label: 'Highchart Definition',
            description: 'Contains all the options for the chart, in the format expected by Highcharts. Any valid Highcharts properties can be set under this property and will be applied to the chart.',
            type: 'json',
            inlineJs: true,
            required: true,
            order: 12
          },
          filters: {
            label: 'Filters',
            description: 'Optional, but if provided, specifies name-value pairs used to filter the data source\'s result set. Each key specifies a column in the data source, and the value specifies either a single value (string) or a set of values (array of strings). Only rows which have the specifies value(s) will be permitted.',
            type: 'hash',
            inlineJsKey: true,
            inlineJsValue: true,
            required: false,
            order: 13
          },
          sortBy: {
            label: 'Sort By',
            description: 'Optional, specifies the field(s) to sort the data by. If the value is a string, it will sort by that single field. If it is an array of strings, multiple fields will be used to sort, with left-to-right priority. The column name can be prefixed with a + or a - sign to indicate the direction or sort. + is ascending, while - is descending. The default sort direction is ascending, so the + sign does not need to be used. If this property is omitted, the original sort order of the data will be used.',
            type: 'string[]',
            inlineJs: true,
            required: false,
            placeholder: 'Column name',
            order: 14
          },
          addShiftPoints: {
            label: 'Add/Shift Points',
            description: 'If true, identifies new points on each data reload and appends them to the right side of the chart, shifting points off of the left side. This is ideal for rolling time-series charts with a fixed number of points. The default is false, which forces a complete redraw of all points.',
            type: 'boolean',
            "default": false,
            required: false,
            order: 15
          }
        },
        sample: {
          highchart: {
            series: [
              {
                x: '',
                y: ''
              }
            ],
            xAxis: [
              {
                type: 'linear'
              }
            ],
            yAxis: [
              {
                title: {
                  text: 'Values'
                }
              }
            ]
          }
        },
        themes: {
          light: {
            chart: {
              style: {
                fontFamily: '"Open Sans", sans-serif'
              }
            },
            drilldown: {
              activeAxisLabelStyle: {
                color: '#333',
                textDecoration: 'none'
              }
            },
            plotOptions: {
              series: {
                shadow: false,
                marker: {
                  enabled: false,
                  states: {
                    hover: {
                      enabled: true
                    }
                  }
                }
              },
              bar: {
                borderWidth: 0
              },
              column: {
                borderWidth: 0
              },
              pie: {
                borderWidth: 0
              }
            },
            title: {
              style: {
                font: '16px "Lato", sans-serif',
                fontWeight: 'bold'
              }
            },
            subtitle: {
              style: {
                font: '12px "Lato", sans-serif'
              }
            },
            xAxis: {
              gridLineWidth: 0,
              labels: {
                style: {
                  fontSize: '11px'
                }
              },
              title: {
                style: {
                  fontSize: '14px',
                  fontWeight: '300'
                }
              }
            },
            yAxis: {
              alternateGridColor: null,
              minorTickInterval: null,
              lineWidth: 0,
              tickWidth: 0,
              labels: {
                style: {
                  fontSize: '11px'
                }
              },
              title: {
                style: {
                  fontSize: '14px',
                  fontWeight: '300'
                }
              }
            },
            legend: {
              borderRadius: 0,
              borderWidth: 0,
              symbolWidth: 40
            }
          },
          gto: {
            chart: {
              style: {
                fontFamily: '"Open Sans", sans-serif'
              }
            },
            plotOptions: {
              series: {
                shadow: false,
                marker: {
                  enabled: false,
                  states: {
                    hover: {
                      enabled: true
                    }
                  }
                }
              },
              bar: {
                borderWidth: 0
              },
              column: {
                borderWidth: 0
              },
              pie: {
                borderWidth: 0
              }
            },
            title: {
              style: {
                font: '16px "Lato", sans-serif',
                fontWeight: 'bold'
              }
            },
            subtitle: {
              style: {
                font: '12px "Lato", sans-serif'
              }
            },
            xAxis: {
              gridLineWidth: 0,
              labels: {
                style: {
                  fontSize: '11px'
                }
              },
              title: {
                style: {
                  fontSize: '14px',
                  fontWeight: '300'
                }
              }
            },
            yAxis: {
              alternateGridColor: null,
              minorTickInterval: null,
              lineWidth: 0,
              tickWidth: 0,
              labels: {
                style: {
                  fontSize: '11px'
                }
              },
              title: {
                style: {
                  fontSize: '14px',
                  fontWeight: '300'
                }
              }
            },
            legend: {
              borderRadius: 0,
              borderWidth: 0,
              symbolWidth: 40
            }
          },
          dark: {
            colors: ['#007D9D', '#82B93A', '#E3AAD5', '#EBDC46', '#AC5B41', '#D1D1D0', '#B07288'],
            chart: {
              backgroundColor: null,
              borderWidth: 0,
              borderRadius: 0,
              plotBackgroundColor: null,
              plotShadow: false,
              plotBorderWidth: 0,
              style: {
                fontFamily: '"Open Sans", sans-serif',
                color: '#FFF'
              }
            },
            drilldown: {
              activeAxisLabelStyle: {
                color: '#999',
                textDecoration: 'none'
              },
              activeDataLabelStyle: {
                color: '#999',
                textDecoration: 'none'
              }
            },
            title: {
              style: {
                color: '#FFF',
                font: '16px "Lato", sans-serif',
                fontWeight: 'bold'
              }
            },
            subtitle: {
              style: {
                color: '#FFF',
                font: '12px "Lato", sans-serif'
              }
            },
            xAxis: {
              gridLineWidth: 0,
              lineColor: '#999',
              tickColor: '#999',
              labels: {
                style: {
                  color: '#999',
                  fontSize: '11px'
                }
              },
              title: {
                style: {
                  color: '#EEE',
                  fontSize: '14px',
                  fontWeight: '300'
                }
              }
            },
            yAxis: {
              alternateGridColor: null,
              minorTickInterval: null,
              gridLineColor: 'rgba(255, 255, 255, .1)',
              minorGridLineColor: 'rgba(255,255,255,0.07)',
              lineWidth: 0,
              tickWidth: 0,
              labels: {
                style: {
                  color: '#999',
                  fontSize: '11px'
                }
              },
              title: {
                style: {
                  color: '#EEE',
                  fontSize: '14px',
                  fontWeight: '300'
                }
              }
            },
            legend: {
              borderRadius: 0,
              borderWidth: 0,
              itemStyle: {
                color: '#CCC'
              },
              itemHoverStyle: {
                color: '#FFF'
              },
              itemHiddenStyle: {
                color: '#333'
              },
              symbolWidth: 40
            },
            labels: {
              style: {
                color: '#CCC'
              }
            },
            tooltip: {
              backgroundColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [[0, 'rgba(96, 96, 96, .8)'], [1, 'rgba(16, 16, 16, .8)']]
              },
              borderWidth: 0,
              style: {
                color: '#FFF'
              }
            },
            plotOptions: {
              series: {
                dataLabels: {
                  style: {
                    color: '#999',
                    textShadow: false
                  }
                },
                shadow: true,
                marker: {
                  enabled: false,
                  states: {
                    hover: {
                      enabled: true
                    }
                  }
                }
              },
              bar: {
                borderWidth: 0
              },
              column: {
                borderWidth: 0
              },
              line: {
                dataLabels: {
                  color: '#CCC'
                },
                marker: {
                  lineColor: '#333'
                }
              },
              pie: {
                borderWidth: 0,
                dataLabels: {
                  color: '#999',
                  fontSize: '14px'
                }
              },
              spline: {
                marker: {
                  lineColor: '#333'
                }
              },
              scatter: {
                marker: {
                  lineColor: '#333'
                }
              },
              candlestick: {
                lineColor: 'white'
              }
            },
            toolbar: {
              itemStyle: {
                color: '#CCC'
              }
            },
            navigation: {
              buttonOptions: {
                symbolStroke: '#DDDDDD',
                hoverSymbolStroke: '#FFFFFF',
                theme: {
                  fill: {
                    linearGradient: {
                      x1: 0,
                      y1: 0,
                      x2: 0,
                      y2: 1
                    },
                    stops: [[0.4, '#606060'], [0.6, '#333333']]
                  },
                  stroke: '#000000'
                }
              }
            },
            rangeSelector: {
              buttonTheme: {
                fill: {
                  linearGradient: {
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: 1
                  },
                  stops: [[0.4, '#888'], [0.6, '#555']]
                },
                stroke: '#000000',
                style: {
                  color: '#CCC',
                  fontWeight: 'bold'
                },
                states: {
                  hover: {
                    fill: {
                      linearGradient: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 1
                      },
                      stops: [[0.4, '#BBB'], [0.6, '#888']]
                    },
                    stroke: '#000000',
                    style: {
                      color: 'white'
                    }
                  },
                  select: {
                    fill: {
                      linearGradient: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 1
                      },
                      stops: [[0.1, '#000'], [0.3, '#333']]
                    },
                    stroke: '#000000',
                    style: {
                      color: 'yellow'
                    }
                  }
                }
              },
              inputStyle: {
                backgroundColor: '#333',
                color: 'silver'
              },
              labelStyle: {
                color: 'silver'
              }
            },
            navigator: {
              handles: {
                backgroundColor: '#666',
                borderColor: '#AAA'
              },
              outlineColor: '#CCC',
              maskFill: 'rgba(16, 16, 16, 0.5)',
              series: {
                color: '#7798BF',
                lineColor: '#A6C7ED'
              }
            },
            scrollbar: {
              barBackgroundColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [[0.4, '#888'], [0.6, '#555']]
              },
              barBorderColor: '#CCC',
              buttonArrowColor: '#CCC',
              buttonBackgroundColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [[0.4, '#888'], [0.6, '#555']]
              },
              buttonBorderColor: '#CCC',
              rifleColor: '#FFF',
              trackBackgroundColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [[0, '#000'], [1, '#333']]
              },
              trackBorderColor: '#666'
            }
          },
          dark2: {
            colors: ['#2095F0', '#FF9A13', '#FFFF13', '#A61DF1', '#28F712', '#FE131E', '#D1D1D0'],
            chart: {
              backgroundColor: null,
              borderWidth: 0,
              borderRadius: 0,
              plotBackgroundColor: null,
              plotShadow: false,
              plotBorderWidth: 0,
              style: {
                fontFamily: '"Open Sans", sans-serif',
                color: '#FFF'
              }
            },
            drilldown: {
              activeAxisLabelStyle: {
                color: '#999',
                textDecoration: 'none'
              },
              activeDataLabelStyle: {
                color: '#999',
                textDecoration: 'none'
              }
            },
            title: {
              style: {
                color: '#FFF',
                font: '16px "Lato", sans-serif',
                fontWeight: 'bold'
              }
            },
            subtitle: {
              style: {
                color: '#FFF',
                font: '12px "Lato", sans-serif'
              }
            },
            xAxis: {
              gridLineWidth: 0,
              lineColor: '#999',
              tickColor: '#999',
              labels: {
                style: {
                  color: '#999',
                  fontSize: '11px'
                }
              },
              title: {
                style: {
                  color: '#EEE',
                  fontSize: '14px',
                  fontWeight: '300'
                }
              }
            },
            yAxis: {
              alternateGridColor: null,
              minorTickInterval: null,
              gridLineColor: 'rgba(255, 255, 255, .1)',
              minorGridLineColor: 'rgba(255,255,255,0.07)',
              lineWidth: 0,
              tickWidth: 0,
              labels: {
                style: {
                  color: '#999',
                  fontSize: '11px'
                }
              },
              title: {
                style: {
                  color: '#EEE',
                  fontSize: '14px',
                  fontWeight: '300'
                }
              }
            },
            legend: {
              borderRadius: 0,
              borderWidth: 0,
              itemStyle: {
                color: '#CCC'
              },
              itemHoverStyle: {
                color: '#FFF'
              },
              itemHiddenStyle: {
                color: '#333'
              },
              symbolWidth: 40
            },
            labels: {
              style: {
                color: '#CCC'
              }
            },
            tooltip: {
              backgroundColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [[0, 'rgba(96, 96, 96, .8)'], [1, 'rgba(16, 16, 16, .8)']]
              },
              borderWidth: 0,
              style: {
                color: '#FFF'
              }
            },
            plotOptions: {
              series: {
                shadow: true,
                marker: {
                  enabled: false,
                  states: {
                    hover: {
                      enabled: true
                    }
                  }
                },
                dataLabels: {
                  style: {
                    color: '#999',
                    textShadow: false
                  }
                }
              },
              bar: {
                borderWidth: 0
              },
              column: {
                borderWidth: 0
              },
              line: {
                dataLabels: {
                  color: '#CCC'
                },
                marker: {
                  lineColor: '#333'
                }
              },
              pie: {
                borderWidth: 0,
                dataLabels: {
                  color: '#999',
                  fontSize: '14px'
                }
              },
              spline: {
                marker: {
                  lineColor: '#333'
                }
              },
              scatter: {
                marker: {
                  lineColor: '#333'
                }
              },
              candlestick: {
                lineColor: 'white'
              }
            },
            toolbar: {
              itemStyle: {
                color: '#CCC'
              }
            },
            navigation: {
              buttonOptions: {
                symbolStroke: '#DDDDDD',
                hoverSymbolStroke: '#FFFFFF',
                theme: {
                  fill: {
                    linearGradient: {
                      x1: 0,
                      y1: 0,
                      x2: 0,
                      y2: 1
                    },
                    stops: [[0.4, '#606060'], [0.6, '#333333']]
                  },
                  stroke: '#000000'
                }
              }
            },
            rangeSelector: {
              buttonTheme: {
                fill: {
                  linearGradient: {
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: 1
                  },
                  stops: [[0.4, '#888'], [0.6, '#555']]
                },
                stroke: '#000000',
                style: {
                  color: '#CCC',
                  fontWeight: 'bold'
                },
                states: {
                  hover: {
                    fill: {
                      linearGradient: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 1
                      },
                      stops: [[0.4, '#BBB'], [0.6, '#888']]
                    },
                    stroke: '#000000',
                    style: {
                      color: 'white'
                    }
                  },
                  select: {
                    fill: {
                      linearGradient: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 1
                      },
                      stops: [[0.1, '#000'], [0.3, '#333']]
                    },
                    stroke: '#000000',
                    style: {
                      color: 'yellow'
                    }
                  }
                }
              },
              inputStyle: {
                backgroundColor: '#333',
                color: 'silver'
              },
              labelStyle: {
                color: 'silver'
              }
            },
            navigator: {
              handles: {
                backgroundColor: '#666',
                borderColor: '#AAA'
              },
              outlineColor: '#CCC',
              maskFill: 'rgba(16, 16, 16, 0.5)',
              series: {
                color: '#7798BF',
                lineColor: '#A6C7ED'
              }
            },
            scrollbar: {
              barBackgroundColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [[0.4, '#888'], [0.6, '#555']]
              },
              barBorderColor: '#CCC',
              buttonArrowColor: '#CCC',
              buttonBackgroundColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [[0.4, '#888'], [0.6, '#555']]
              },
              buttonBorderColor: '#CCC',
              rifleColor: '#FFF',
              trackBackgroundColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [[0, '#000'], [1, '#333']]
              },
              trackBorderColor: '#666'
            }
          },
          darkmetro: {
            colors: ['#007D9D', '#82B93A', '#E3AAD5', '#EBDC46', '#AC5B41', '#D1D1D0', '#B07288'],
            chart: {
              backgroundColor: null,
              borderWidth: 0,
              borderRadius: 0,
              plotBackgroundColor: null,
              plotShadow: false,
              plotBorderWidth: 0,
              style: {
                fontFamily: '"Open Sans", sans-serif',
                color: '#FFF'
              }
            },
            drilldown: {
              activeAxisLabelStyle: {
                color: '#999',
                textDecoration: 'none'
              },
              activeDataLabelStyle: {
                color: '#999',
                textDecoration: 'none'
              }
            },
            title: {
              style: {
                color: '#FFF',
                font: '16px "Lato", sans-serif',
                fontWeight: 'bold'
              }
            },
            subtitle: {
              style: {
                color: '#FFF',
                font: '12px "Lato", sans-serif'
              }
            },
            xAxis: {
              gridLineWidth: 0,
              lineColor: '#999',
              tickColor: '#999',
              labels: {
                style: {
                  color: '#999',
                  fontSize: '11px'
                }
              },
              title: {
                style: {
                  color: '#EEE',
                  fontSize: '14px',
                  fontWeight: '300'
                }
              }
            },
            yAxis: {
              alternateGridColor: null,
              minorTickInterval: null,
              gridLineColor: 'rgba(255, 255, 255, .1)',
              minorGridLineColor: 'rgba(255,255,255,0.07)',
              lineWidth: 0,
              tickWidth: 0,
              labels: {
                style: {
                  color: '#999',
                  fontSize: '11px'
                }
              },
              title: {
                style: {
                  color: '#EEE',
                  fontSize: '14px',
                  fontWeight: '300'
                }
              }
            },
            legend: {
              borderRadius: 0,
              borderWidth: 0,
              itemStyle: {
                color: '#CCC'
              },
              itemHoverStyle: {
                color: '#FFF'
              },
              itemHiddenStyle: {
                color: '#333'
              },
              symbolWidth: 40
            },
            labels: {
              style: {
                color: '#CCC'
              }
            },
            tooltip: {
              backgroundColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [[0, 'rgba(96, 96, 96, .8)'], [1, 'rgba(16, 16, 16, .8)']]
              },
              borderWidth: 0,
              style: {
                color: '#FFF'
              }
            },
            plotOptions: {
              series: {
                dataLabels: {
                  style: {
                    color: '#999',
                    textShadow: false
                  }
                },
                shadow: true,
                marker: {
                  enabled: false,
                  states: {
                    hover: {
                      enabled: true
                    }
                  }
                }
              },
              bar: {
                borderWidth: 0
              },
              column: {
                borderWidth: 0
              },
              line: {
                dataLabels: {
                  color: '#CCC'
                },
                marker: {
                  lineColor: '#333'
                }
              },
              pie: {
                borderWidth: 0,
                dataLabels: {
                  color: '#999',
                  fontSize: '14px'
                }
              },
              spline: {
                marker: {
                  lineColor: '#333'
                }
              },
              scatter: {
                marker: {
                  lineColor: '#333'
                }
              },
              candlestick: {
                lineColor: 'white'
              }
            },
            toolbar: {
              itemStyle: {
                color: '#CCC'
              }
            },
            navigation: {
              buttonOptions: {
                symbolStroke: '#DDDDDD',
                hoverSymbolStroke: '#FFFFFF',
                theme: {
                  fill: {
                    linearGradient: {
                      x1: 0,
                      y1: 0,
                      x2: 0,
                      y2: 1
                    },
                    stops: [[0.4, '#606060'], [0.6, '#333333']]
                  },
                  stroke: '#000000'
                }
              }
            },
            rangeSelector: {
              buttonTheme: {
                fill: {
                  linearGradient: {
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: 1
                  },
                  stops: [[0.4, '#888'], [0.6, '#555']]
                },
                stroke: '#000000',
                style: {
                  color: '#CCC',
                  fontWeight: 'bold'
                },
                states: {
                  hover: {
                    fill: {
                      linearGradient: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 1
                      },
                      stops: [[0.4, '#BBB'], [0.6, '#888']]
                    },
                    stroke: '#000000',
                    style: {
                      color: 'white'
                    }
                  },
                  select: {
                    fill: {
                      linearGradient: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 1
                      },
                      stops: [[0.1, '#000'], [0.3, '#333']]
                    },
                    stroke: '#000000',
                    style: {
                      color: 'yellow'
                    }
                  }
                }
              },
              inputStyle: {
                backgroundColor: '#333',
                color: 'silver'
              },
              labelStyle: {
                color: 'silver'
              }
            },
            navigator: {
              handles: {
                backgroundColor: '#666',
                borderColor: '#AAA'
              },
              outlineColor: '#CCC',
              maskFill: 'rgba(16, 16, 16, 0.5)',
              series: {
                color: '#7798BF',
                lineColor: '#A6C7ED'
              }
            },
            scrollbar: {
              barBackgroundColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [[0.4, '#888'], [0.6, '#555']]
              },
              barBorderColor: '#CCC',
              buttonArrowColor: '#CCC',
              buttonBackgroundColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [[0.4, '#888'], [0.6, '#555']]
              },
              buttonBorderColor: '#CCC',
              rifleColor: '#FFF',
              trackBackgroundColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [[0, '#000'], [1, '#333']]
              },
              trackBorderColor: '#666'
            }
          },
          charcoal: {
            colors: ['#007D9D', '#82B93A', '#E3AAD5', '#EBDC46', '#AC5B41', '#D1D1D0', '#B07288'],
            chart: {
              backgroundColor: null,
              borderWidth: 0,
              borderRadius: 0,
              plotBackgroundColor: null,
              plotShadow: false,
              plotBorderWidth: 0,
              style: {
                fontFamily: '"Open Sans", sans-serif',
                color: '#FFF'
              }
            },
            drilldown: {
              activeAxisLabelStyle: {
                color: '#999',
                textDecoration: 'none'
              },
              activeDataLabelStyle: {
                color: '#999',
                textDecoration: 'none'
              }
            },
            title: {
              style: {
                color: '#FFF',
                font: '16px "Lato", sans-serif',
                fontWeight: 'bold'
              }
            },
            subtitle: {
              style: {
                color: '#FFF',
                font: '12px "Lato", sans-serif'
              }
            },
            xAxis: {
              gridLineWidth: 0,
              lineColor: '#999',
              tickColor: '#999',
              labels: {
                style: {
                  color: '#999',
                  fontSize: '11px'
                }
              },
              title: {
                style: {
                  color: '#EEE',
                  fontSize: '14px',
                  fontWeight: '300'
                }
              }
            },
            yAxis: {
              alternateGridColor: null,
              minorTickInterval: null,
              gridLineColor: 'rgba(255, 255, 255, .1)',
              minorGridLineColor: 'rgba(255,255,255,0.07)',
              lineWidth: 0,
              tickWidth: 0,
              labels: {
                style: {
                  color: '#999',
                  fontSize: '11px'
                }
              },
              title: {
                style: {
                  color: '#EEE',
                  fontSize: '14px',
                  fontWeight: '300'
                }
              }
            },
            legend: {
              borderRadius: 0,
              borderWidth: 0,
              itemStyle: {
                color: '#CCC'
              },
              itemHoverStyle: {
                color: '#FFF'
              },
              itemHiddenStyle: {
                color: '#333'
              },
              symbolWidth: 40
            },
            labels: {
              style: {
                color: '#CCC'
              }
            },
            tooltip: {
              backgroundColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [[0, 'rgba(96, 96, 96, .8)'], [1, 'rgba(16, 16, 16, .8)']]
              },
              borderWidth: 0,
              style: {
                color: '#FFF'
              }
            },
            plotOptions: {
              series: {
                dataLabels: {
                  style: {
                    color: '#999',
                    textShadow: false
                  }
                },
                shadow: false,
                marker: {
                  enabled: false,
                  states: {
                    hover: {
                      enabled: true
                    }
                  }
                }
              },
              bar: {
                borderWidth: 0
              },
              column: {
                borderWidth: 0
              },
              line: {
                dataLabels: {
                  color: '#CCC'
                },
                marker: {
                  lineColor: '#333'
                }
              },
              pie: {
                borderWidth: 0,
                dataLabels: {
                  color: '#999',
                  fontSize: '14px'
                }
              },
              spline: {
                marker: {
                  lineColor: '#333'
                }
              },
              scatter: {
                marker: {
                  lineColor: '#333'
                }
              },
              candlestick: {
                lineColor: 'white'
              }
            },
            toolbar: {
              itemStyle: {
                color: '#CCC'
              }
            },
            navigation: {
              buttonOptions: {
                symbolStroke: '#DDDDDD',
                hoverSymbolStroke: '#FFFFFF',
                theme: {
                  fill: {
                    linearGradient: {
                      x1: 0,
                      y1: 0,
                      x2: 0,
                      y2: 1
                    },
                    stops: [[0.4, '#606060'], [0.6, '#333333']]
                  },
                  stroke: '#000000'
                }
              }
            },
            rangeSelector: {
              buttonTheme: {
                fill: {
                  linearGradient: {
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: 1
                  },
                  stops: [[0.4, '#888'], [0.6, '#555']]
                },
                stroke: '#000000',
                style: {
                  color: '#CCC',
                  fontWeight: 'bold'
                },
                states: {
                  hover: {
                    fill: {
                      linearGradient: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 1
                      },
                      stops: [[0.4, '#BBB'], [0.6, '#888']]
                    },
                    stroke: '#000000',
                    style: {
                      color: 'white'
                    }
                  },
                  select: {
                    fill: {
                      linearGradient: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 1
                      },
                      stops: [[0.1, '#000'], [0.3, '#333']]
                    },
                    stroke: '#000000',
                    style: {
                      color: 'yellow'
                    }
                  }
                }
              },
              inputStyle: {
                backgroundColor: '#333',
                color: 'silver'
              },
              labelStyle: {
                color: 'silver'
              }
            },
            navigator: {
              handles: {
                backgroundColor: '#666',
                borderColor: '#AAA'
              },
              outlineColor: '#CCC',
              maskFill: 'rgba(16, 16, 16, 0.5)',
              series: {
                color: '#7798BF',
                lineColor: '#A6C7ED'
              }
            },
            scrollbar: {
              barBackgroundColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [[0.4, '#888'], [0.6, '#555']]
              },
              barBorderColor: '#CCC',
              buttonArrowColor: '#CCC',
              buttonBackgroundColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [[0.4, '#888'], [0.6, '#555']]
              },
              buttonBorderColor: '#CCC',
              rifleColor: '#FFF',
              trackBackgroundColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [[0, '#000'], [1, '#333']]
              },
              trackBorderColor: '#666'
            }
          }
        }
      },
      clock: {
        name: 'clock',
        label: 'Clock',
        icon: 'fa-clock-o',
        properties: {
          format: {
            label: 'Format',
            description: 'Enter time format of your choice. "http://momentjs.com/docs/#/displaying/format/" can help in choosing time formats',
            type: 'string',
            "default": 'dddd, MMMM Do YYYY, h:mm:ss a',
            required: false,
            order: 10
          },
          timezone: {
            label: 'Time Zone',
            description: 'Enter time zone of your choice. "http://momentjs.com/timezone/" can help in choosing time zone',
            required: false,
            type: 'string',
            order: 11
          }
        }
      },
      header: {
        name: 'header',
        label: 'Header',
        icon: 'fa-header',
        properties: {
          headerTitle: {
            label: 'Header Title',
            description: 'Contains properties for displaying a title in the header.',
            type: 'propertyset',
            order: 10,
            properties: {
              showTitle: {
                label: 'Show Title',
                description: 'Determines whether a title will be shown. If the Widget has a Title, it will be shown, otherwise it defaults to the Dashboard\'s Display Name or Name.',
                type: 'boolean',
                "default": true,
                required: false,
                inlineJs: true,
                order: 1
              },
              showPageName: {
                label: 'Show Page Name',
                description: 'Determines whether the current page name will be shown as part of the title.',
                type: 'boolean',
                "default": true,
                required: false,
                inlineJs: true,
                order: 2
              },
              pageNameSeparator: {
                label: 'Page Name Separator',
                description: 'Configures a string to use to separate the Dashboard name from the Page name.  Defaults to a space.',
                type: 'string',
                required: false,
                "default": '',
                inlineJs: true,
                defaultHidden: true,
                order: 3
              },
              titleSize: {
                label: 'Title Size',
                description: 'Sets the font size for the header title (if displayed). Any valid CSS height is allowed.',
                type: 'string',
                required: false,
                inlineJs: true,
                order: 5
              },
              logoUrl: {
                label: 'Logo URL',
                description: 'Contains a URL to a dashboard logo to display before the title. Data URLs can be used.',
                type: 'string',
                required: false,
                inlineJs: true,
                order: 10
              },
              logoSize: {
                label: 'Logo Size',
                description: 'Sets the height for the header logo (if displayed). The logo will be scaled without changing the aspect ratio. Any valid CSS height is allowed.',
                type: 'string',
                required: false,
                inlineJs: true,
                order: 11
              },
              link: {
                label: 'Link',
                description: 'If set, makes the Logo and Title a link to this URL.',
                type: 'string',
                required: false,
                inlineJs: true,
                order: 20
              }
            }
          },
          parameters: {
            label: 'Parameters',
            description: 'Contains properties for displaying Dashboard Parameters in the header.',
            type: 'propertyset',
            order: 20,
            properties: {
              showParameters: {
                label: 'Show Parameters',
                description: 'Determines whether Parameters will be shown.',
                type: 'boolean',
                "default": false,
                required: false,
                inlineJs: true,
                order: 1
              },
              showUpdateButton: {
                label: 'Show Update Button',
                description: 'If true, an "Update" button will be displayed after the Parameters. The updateEvent property must be used to apply an action to the button click event, else nothing will happen.',
                type: 'boolean',
                "default": false,
                required: false,
                order: 2
              },
              updateButtonLabel: {
                label: 'Update Button Label',
                description: 'Customizes the label for the Update button, if shown.',
                type: 'string',
                "default": 'Update',
                defaultHidden: true,
                required: false,
                order: 2
              },
              updateEvent: {
                label: 'Update Button Click Event',
                description: 'This event occurs when the Update button is clicked, if shown.',
                type: 'editor',
                editorMode: 'javascript',
                required: false,
                order: 10
              },
              parametersIncluded: {
                label: 'Included Parameters',
                description: 'Optionally specifies an array of Parameter names, limiting the Header to only displaying the specified Parameters. This does not override the editInHeader property of each Parameter, which needs to be set true to appear in the Header.',
                type: 'string[]',
                required: false,
                defaultHidden: true,
                order: 11
              }
            }
          },
          customHtml: {
            label: 'HTML Content',
            description: 'Provides additional HTML content to be displayed in the header.  This can be used to customize the header display.',
            type: 'editor',
            editorMode: 'html',
            required: false,
            inlineJs: true,
            order: 30
          }
        }
      },
      html: {
        name: 'html',
        label: 'HTML',
        icon: 'fa-html5',
        properties: {
          dataSource: {
            label: 'Data Source',
            description: 'Optional; the name of the Data Source providing data for this Widget. If set, the `html` property will be used as a repeater and rendered once for each row.',
            placeholder: 'Data Source name',
            type: 'string',
            required: false,
            options: datasourceOptions,
            order: 10
          },
          html: {
            label: 'HTML',
            description: 'Contains HTML markup to be displayed. If dataSource is set, this HTML will be repeated for each row in the result.',
            type: 'editor',
            editorMode: 'html',
            required: false,
            "default": '',
            order: 11
          },
          preHtml: {
            label: 'Pre-HTML',
            description: 'Optional, contains HTML markup which is displayed before the main body of HTML.',
            type: 'editor',
            editorMode: 'html',
            required: false,
            "default": '',
            order: 12
          },
          postHtml: {
            label: 'Post-HTML',
            description: 'Optional, contains HTML markup which is displayed after the main body of HTML.',
            type: 'editor',
            editorMode: 'html',
            required: false,
            "default": '',
            order: 13
          },
          filters: {
            label: 'Filters',
            description: 'Optional, but if provided, specifies name-value pairs used to filter the data source\'s result set. Each key specifies a column in the data source, and the value specifies either a single value (string) or a set of values (array of strings). Only rows which have the specifies value(s) will be permitted.',
            type: 'hash',
            inlineJsKey: true,
            inlineJsValue: true,
            required: false,
            order: 14
          },
          sortBy: {
            label: 'Sort By',
            description: 'Optional, specifies the field(s) to sort the data by. If the value is a string, it will sort by that single field. If it is an array of strings, multiple fields will be used to sort, with left-to-right priority. The column name can be prefixed with a + or a - sign to indicate the direction or sort. + is ascending, while - is descending. The default sort direction is ascending, so the + sign does not need to be used. If this property is omitted, the original sort order of the data will be used.',
            placeholder: 'Column name',
            type: 'string[]',
            inlineJs: true,
            required: false,
            order: 15
          }
        }
      },
      iframe: {
        name: 'iframe',
        label: 'iFrame',
        icon: 'fa-desktop',
        properties: {
          url: {
            label: 'Url',
            description: 'Specifies the URL to be loaded within the Widget.',
            type: 'string',
            placeholder: 'Url',
            required: true,
            "default": 'http://www.expedia.com',
            order: 10
          },
          refresh: {
            label: 'Refresh',
            description: 'Optional number of seconds; enables reloading the iframe contents periodically every N seconds.',
            placeholder: 'Seconds',
            type: 'integer',
            required: false,
            order: 11
          }
        }
      },
      image: {
        name: 'image',
        label: 'Image',
        icon: 'fa-image-o',
        properties: {
          images: {
            label: 'Images',
            singleLabel: 'Image',
            description: 'One or more Images to display in this widget.',
            type: 'propertyset[]',
            required: true,
            "default": [],
            order: 10,
            properties: {
              url: {
                label: 'URL',
                description: 'URL to the image to be displayed.',
                placeholder: 'Url',
                inlineJs: true,
                required: true,
                type: 'string',
                order: 1
              },
              link: {
                label: 'Link',
                description: 'Optional, specifies a URL that will be opened if the image is clicked on.',
                placeholder: 'URL',
                type: 'url',
                inlineJs: true,
                required: false,
                order: 13
              },
              tooltip: {
                label: 'Tooltip',
                description: 'Sets the tooltip of the image.',
                placeholder: 'Tooltip',
                type: 'string',
                inlineJs: true,
                required: false,
                defaultHidden: true,
                order: 2
              },
              backgroundSize: {
                label: 'Background-Size',
                description: 'Specifies the CSS property background-size, which determines how the image is fit into the Widget.',
                type: 'string',
                inlineJs: true,
                required: false,
                defaultHidden: true,
                options: {
                  auto: {
                    value: 'auto'
                  },
                  contain: {
                    value: 'contain'
                  },
                  cover: {
                    value: 'cover'
                  },
                  '100%': {
                    value: '100%'
                  }
                },
                order: 3
              },
              backgroundPosition: {
                label: 'Background Position',
                description: 'Specifies the CSS property background-position, which determines where the image is positioned in the Widget.',
                type: 'string',
                inlineJs: true,
                required: false,
                "default": 'center',
                defaultHidden: true,
                options: {
                  center: {
                    value: 'center'
                  },
                  top: {
                    value: 'top'
                  },
                  bottom: {
                    value: 'bottom'
                  },
                  left: {
                    value: 'left'
                  },
                  right: {
                    value: 'right'
                  }
                },
                order: 4
              },
              backgroundColor: {
                label: 'Background Color',
                description: 'Optionally specifies the CSS property background-color, which is drawn behind this image.  It may appear if the image does not cover the Widget, or if the image is not opaque.',
                type: 'string',
                inlineJs: true,
                required: false,
                defaultHidden: true,
                order: 5
              },
              backgroundRepeat: {
                label: 'Background Repeat',
                description: 'Optionally specifies the CSS property background-repeat, which determiens if or how the image is repeated within the Widget.',
                type: 'string',
                inlineJs: true,
                required: false,
                "default": 'no-repeat',
                defaultHidden: true,
                options: {
                  'no-repeat': {
                    value: 'no-repeat'
                  },
                  'repeat': {
                    value: 'repeat'
                  },
                  'repeat-x': {
                    value: 'repeat-x'
                  },
                  'repeat-y': {
                    value: 'repeat-y'
                  },
                  'space': {
                    value: 'space'
                  },
                  'round': {
                    value: 'round'
                  }
                },
                order: 6
              },
              filters: {
                label: 'Filters',
                description: 'Optionally applies one or more CSS filters to the image. If provided, it should be a string containing one or more filters, separated by spaces.',
                type: 'string',
                inlineJs: true,
                required: false,
                defaultHidden: true,
                order: 7
              }
            }
          },
          duration: {
            label: 'Auto-Rotate Duration',
            description: 'Optional number of seconds; enables rotating among a set of images periodically.',
            placeholder: 'Seconds',
            type: 'integer',
            "default": 0,
            required: false,
            order: 11
          }
        }
      },
      javascript: {
        name: 'javascript',
        label: 'JavaScript',
        icon: 'fa-cogs',
        properties: {
          dataSource: {
            label: 'Data Source',
            description: 'Optional; the name of the Data Source providing data for this Widget. If set, the data source will be called and the result will be passed to the JavaScript function.',
            placeholder: 'Data Source name',
            type: 'string',
            required: false,
            options: datasourceOptions,
            order: 10
          },
          functionName: {
            label: 'Function Name',
            description: 'JavaScript function name used to create a controller instance. Supports namespaces/drilldown using periods, e.g. Cyclotron.functions.scatterPlot',
            placeholder: 'Function Name',
            type: 'string',
            required: true,
            order: 11
          },
          refresh: {
            label: 'Refresh',
            description: 'Optional; enables re-invoking the javascript object periodically every N seconds.',
            placeholder: 'Seconds',
            type: 'integer',
            required: false,
            order: 12
          },
          filters: {
            label: 'Filters',
            description: 'Optional, but if provided, specifies name-value pairs used to filter the data source\'s result set. Each key specifies a column in the data source, and the value specifies either a single value (string) or a set of values (array of strings). Only rows which have the specifies value(s) will be permitted.',
            type: 'hash',
            inlineJsKey: true,
            inlineJsValue: true,
            required: false,
            order: 13
          },
          sortBy: {
            label: 'Sort By',
            description: 'Optional, specifies the field(s) to sort the data by. If the value is a string, it will sort by that single field. If it is an array of strings, multiple fields will be used to sort, with left-to-right priority. The column name can be prefixed with a + or a - sign to indicate the direction or sort. + is ascending, while - is descending. The default sort direction is ascending, so the + sign does not need to be used. If this property is omitted, the original sort order of the data will be used.',
            placeholder: 'Column name',
            type: 'string[]',
            inlineJs: true,
            required: false,
            order: 14
          }
        }
      },
      linkedWidget: {
        name: 'linkedWidget',
        label: 'Linked Widget',
        icon: 'fa-link',
        properties: {
          linkedWidget: {
            label: 'Linked Widget',
            description: 'Selects another Widget in this Dashboard to link.',
            type: 'string',
            required: true,
            options: linkedWidgetOptions,
            order: 10
          }
        }
      },
      number: {
        name: 'number',
        label: 'Number',
        icon: 'fa-cog',
        properties: {
          dataSource: {
            label: 'Data Source',
            description: 'Optional, but required to use data expressions e.g. "#{columnName}". The name of the Data Source providing data for this Widget.',
            placeholder: 'Data Source Name',
            type: 'string',
            required: false,
            options: datasourceOptions,
            order: 10
          },
          numbers: {
            label: 'Numbers',
            singleLabel: 'number',
            description: 'One or more Numbers to display in this widget.',
            type: 'propertyset[]',
            required: true,
            "default": [],
            order: 11,
            properties: {
              number: {
                label: 'Number',
                description: 'Number value or expression.',
                placeholder: 'Value',
                inlineJs: true,
                required: false,
                type: 'string',
                order: 1
              },
              prefix: {
                label: 'Prefix',
                description: 'Optional; specifies a prefix to append to the number.',
                placeholder: 'Prefix',
                type: 'string',
                inlineJs: true,
                order: 2
              },
              suffix: {
                label: 'Suffix',
                description: 'Optional; specifies a suffix to append to the number.',
                placeholder: 'Suffix',
                type: 'string',
                inlineJs: true,
                order: 3
              },
              color: {
                label: 'Color',
                description: 'Sets the color of the number.',
                placeholder: 'Color',
                type: 'string',
                inlineJs: true,
                required: false,
                defaultHidden: true,
                order: 4
              },
              tooltip: {
                label: 'Tooltip',
                description: 'Sets the tooltip of the number.',
                placeholder: 'Tooltip',
                type: 'string',
                inlineJs: true,
                required: false,
                defaultHidden: true,
                order: 5
              },
              icon: {
                label: 'Icon',
                description: 'Optional Font Awesome icon class to be displayed with the number.',
                placeholder: 'Icon Class',
                inlineJs: true,
                type: 'string',
                defaultHidden: true,
                order: 6
              },
              iconColor: {
                label: 'Icon Color',
                description: 'Optionally specifies a color for the icon if the icon property is also set. The value can be a named color (e.g. "red"), a hex color (e.g. "#AA0088") or a data source column/inline javascript (e.g. "#{statusColor}").',
                type: 'string',
                inlineJs: true,
                defaultHidden: true,
                order: 7
              },
              iconTooltip: {
                label: 'IconTooltip',
                description: 'Sets the tooltip of the icon.',
                placeholder: 'Icon Tooltip',
                type: 'string',
                inlineJs: true,
                required: false,
                defaultHidden: true,
                order: 8
              },
              onClick: {
                label: 'Click Event',
                description: 'This event occurs when the user clicks on the number. If this property is set with a JavaScript function, the function will be called as an event handler.',
                type: 'editor',
                editorMode: 'javascript',
                required: false,
                defaultHidden: true,
                order: 9
              }
            }
          },
          orientation: {
            label: 'Orientation',
            description: 'Controls the direction in which the numbers are arranged.',
            type: 'string',
            required: false,
            "default": 'vertical',
            options: {
              vertical: {
                value: 'vertical'
              },
              horizontal: {
                value: 'horizontal'
              }
            },
            order: 12
          },
          autoSize: {
            label: 'Auto-Size Numbers',
            description: 'If true, up to 4 numbers will be automatically sized-to-fit in the Widget.  If false, or if there are more than four numbers, all numbers will be listed sequentially.',
            type: 'boolean',
            required: false,
            "default": true,
            order: 13
          },
          link: {
            label: 'Link',
            description: 'Optional, specifies a URL that will be displayed at the bottom of the widget as a link.',
            placeholder: 'URL',
            type: 'url',
            required: false,
            order: 14
          },
          filters: {
            label: 'Filters',
            description: "Optional, but if provided, specifies name-value pairs used to filter the data source's result set. This has no effect if the dataSource property is not set.\nOnly the first row of the data source is used to get data, so this property can be used to narrow down on the correct row",
            type: 'hash',
            inlineJsKey: true,
            inlineJsValue: true,
            required: false,
            order: 15
          },
          sortBy: {
            label: 'Sort By',
            description: 'Optional, specifies the field(s) to sort the data by. If the value is a string, it will sort by that single field. If it is an array of strings, multiple fields will be used to sort, with left-to-right priority. The column name can be prefixed with a + or a - sign to indicate the direction or sort. + is ascending, while - is descending. The default sort direction is ascending, so the + sign does not need to be used. If this property is omitted, the original sort order of the data will be used.\nOnly the first row of the data source is used to get data, so this property can be used to sort the data and ensure the correct row comes first.',
            type: 'string[]',
            inlineJs: true,
            required: false,
            placeholder: 'Column name',
            order: 16
          }
        }
      },
      qrcode: {
        name: 'qrcode',
        label: 'QRcode',
        icon: 'fa-cogs',
        properties: {
          text: {
            label: 'Text',
            description: 'Text content of the generated QR code.',
            placeholder: 'QR Code Contents',
            type: 'string',
            required: false,
            order: 10
          },
          maxSize: {
            label: 'Max Size',
            description: 'Maximum height/width of the QR code.',
            type: 'integer',
            required: false,
            order: 11
          },
          useUrl: {
            label: 'Use URL',
            description: 'Overrides the text property and generates a QR code with the current Dashboard\'s URL.',
            type: 'boolean',
            "default": false,
            required: false,
            order: 12
          },
          dataSource: {
            label: 'Data Source',
            description: 'Optional; specifies the name of a Dashboard data source. If set, the data source will be called and the result will be available for the QR code generation.',
            placeholder: 'Data Source name',
            type: 'string',
            required: false,
            options: datasourceOptions,
            defaultHidden: true,
            order: 13
          },
          filters: {
            label: 'Filters',
            description: 'Optional, but if provided, specifies name-value pairs used to filter the data source\'s result set.  Each key specifies a column in the data source, and the value specifies either a single value (string) or a set of values (array of strings).  Only rows which have the specifies value(s) will be permitted.',
            type: 'hash',
            inlineJsKey: true,
            inlineJsValue: true,
            required: false,
            defaultHidden: true,
            order: 14
          },
          sortBy: {
            label: 'Sort By',
            description: 'Optional, specifies the field(s) to sort the data by. If the value is a string, it will sort by that single field. If it is an array of strings, multiple fields will be used to sort, with left-to-right priority. The column name can be prefixed with a + or a - sign to indicate the direction or sort. + is ascending, while - is descending. The default sort direction is ascending, so the + sign does not need to be used. If this property is omitted, the original sort order of the data will be used.',
            placeholder: 'Column name',
            type: 'string[]',
            inlineJs: true,
            required: false,
            defaultHidden: true,
            order: 15
          },
          colorDark: {
            label: 'Dark Color',
            description: 'CSS color name or hex color code, used to draw the dark portions of the QR code.',
            placeholder: 'CSS color or hex color code',
            type: 'string',
            "default": '#000000',
            required: false,
            defaultHidden: true,
            order: 16
          },
          colorLight: {
            label: 'Light Color',
            description: 'CSS color name or hex color code, used to draw the dark portions of the QR code.',
            placeholder: 'CSS color or hex color code',
            type: 'string',
            "default": '#ffffff',
            required: false,
            defaultHidden: true,
            order: 17
          }
        },
        sample: {
          text: 'hello'
        }
      },
      stoplight: {
        name: 'stoplight',
        label: 'Stoplight',
        icon: 'fa-cog',
        properties: {
          dataSource: {
            label: 'Data Source',
            description: 'The name of the Data Source providing data for this Widget.',
            placeholder: 'Data Source Name',
            type: 'string',
            required: false,
            options: datasourceOptions,
            order: 10
          },
          rules: {
            label: 'Rules',
            description: 'Contains rule expressions for the different states of the Stoplight. The rules will be evaluated from red to green, and only the first rule that returns true will be enabled',
            type: 'propertyset',
            required: true,
            order: 11,
            properties: {
              green: {
                label: 'Green',
                description: 'The rule expression evaluated to determine if the green light is active. It should be an inline JavaScript expression, e.g. ${true}. It can contain column values using #{name} notation, which will be replaced before executing the JavaScript. It should return true or false, and any non-true value will be treated as false.',
                type: 'string',
                placeholder: 'Rule Expression',
                inlineJs: true,
                order: 3
              },
              yellow: {
                label: 'Yellow',
                description: 'The rule expression evaluated to determine if the yellow light is active. It should be an inline JavaScript expression, e.g. ${true}. It can contain column values using #{name} notation, which will be replaced before executing the JavaScript. It should return true or false, and any non-true value will be treated as false.',
                type: 'string',
                placeholder: 'Rule Expression',
                inlineJs: true,
                order: 2
              },
              red: {
                label: 'Red',
                description: 'The rule expression evaluated to determine if the red light is active. It should be an inline JavaScript expression, e.g. ${true}. It can contain column values using #{name} notation, which will be replaced before executing the JavaScript. It should return true or false, and any non-true value will be treated as false.',
                type: 'string',
                placeholder: 'Rule Expression',
                inlineJs: true,
                order: 1
              }
            }
          },
          tooltip: {
            label: 'Tooltip',
            description: 'Sets the tooltip of the stoplight.',
            placeholder: 'Tooltip',
            type: 'string',
            inlineJs: true,
            required: false,
            defaultHidden: true,
            order: 12
          },
          filters: {
            label: 'Filters',
            description: "Optional, but if provided, specifies name-value pairs used to filter the data source's result set. This has no effect if the dataSource property is not set.\nOnly the first row of the data source is used to get data, so this property can be used to narrow down on the correct row",
            type: 'hash',
            inlineJsKey: true,
            inlineJsValue: true,
            required: false,
            order: 15
          },
          sortBy: {
            label: 'Sort By',
            description: 'Optional, specifies the field(s) to sort the data by. If the value is a string, it will sort by that single field. If it is an array of strings, multiple fields will be used to sort, with left-to-right priority. The column name can be prefixed with a + or a - sign to indicate the direction or sort. + is ascending, while - is descending. The default sort direction is ascending, so the + sign does not need to be used. If this property is omitted, the original sort order of the data will be used.\nOnly the first row of the data source is used to get data, so this property can be used to sort the data and ensure the correct row comes first.',
            type: 'string[]',
            inlineJs: true,
            required: false,
            placeholder: 'Column name',
            order: 16
          }
        }
      },
      table: {
        name: 'table',
        label: 'Table',
        icon: 'fa-table',
        properties: {
          dataSource: {
            label: 'Data Source',
            description: 'The name of the Data Source providing data for this Widget.',
            placeholder: 'Data Source name',
            type: 'string',
            required: true,
            options: datasourceOptions,
            order: 10
          },
          columns: {
            label: 'Columns',
            singleLabel: 'column',
            description: 'Specifies the columns to display in the table, and their properties. If omitted, the columns will be automatically determined, either using a list of fields provided by the data source, or by looking at the first row.',
            type: 'propertyset[]',
            inlineJs: true,
            properties: {
              name: {
                label: 'Name',
                description: 'Indicates the name of the data source field to use for this column.',
                type: 'string',
                inlineJs: true,
                order: 1
              },
              label: {
                label: 'Label',
                description: 'If provided, sets the header text for the column. If omitted, the name will be used. "#value" can be used to reference the "name" property of the column.',
                type: 'string',
                inlineJs: true,
                order: 2
              },
              text: {
                label: 'Text',
                description: 'Overrides the text in the cell using this value as an expression.',
                type: 'string',
                inlineJs: true,
                defaultHidden: true,
                order: 3
              },
              tooltip: {
                label: 'Tooltip',
                description: 'Optionally specifies a tooltip to display for each cell in the column.',
                type: 'string',
                inlineJs: true,
                defaultHidden: true
              },
              headerTooltip: {
                label: 'Header Tooltip',
                description: 'Optionally specifies a tooltip to display for the column header. "#value" can be used to reference the "name" property of the column.',
                type: 'string',
                inlineJs: true,
                defaultHidden: true
              },
              onClick: {
                label: 'Click Event',
                description: 'This event occurs when the user clicks on a cell in this column. If this property is set with a JavaScript function, the function will be called as an event handler.',
                type: 'editor',
                editorMode: 'javascript',
                required: false,
                defaultHidden: true
              },
              link: {
                label: 'Link',
                description: 'If provided, the cell text will be made into a link rather than plain text.',
                type: 'url',
                inlineJs: true,
                defaultHidden: true
              },
              openLinksInNewWindow: {
                label: 'Open Links in New Window',
                description: 'If true, links will open in a new browser window; this is the default.',
                type: 'boolean',
                "default": true,
                defaultHidden: true
              },
              numeralformat: {
                label: 'Numeral Format',
                description: 'Optionally specifies a Numeral.js-compatible format string, used to reformat the column value for display.',
                type: 'string',
                inlineJs: true,
                defaultHidden: true
              },
              image: {
                label: 'Image',
                description: 'Optionally specifies a URL to an image to display in the column. The URL can be parameterized using any column values.',
                type: 'url',
                inlineJs: true,
                defaultHidden: true
              },
              imageHeight: {
                label: 'Image Height',
                description: 'Optionally sets the height for the images displayed using the image property. If omitted, each image will be displayed at "1em" (the same height as text in the cell). Any valid CSS value string can be used, e.g. "110%", "20px", etc.',
                type: 'string',
                inlineJs: true,
                defaultHidden: true
              },
              icon: {
                label: 'Icon',
                description: 'Optionally specifies a Font Awesome icon class to be displayed in the cell.',
                type: 'string',
                inlineJs: true,
                defaultHidden: true
              },
              iconColor: {
                label: 'Icon Color',
                description: 'Optionally specifies a color for the icon if the icon property is also set. The value can be a named color (e.g. "red"), a hex color (e.g. "#AA0088") or a data source column/inline javascript (e.g. "#{statusColor}").',
                type: 'string',
                inlineJs: true,
                defaultHidden: true
              },
              border: {
                label: 'Border',
                description: 'Optionally draws a border on either or both sides of the column. If set, this value should be either "left", "right", or "left,right" to indicate on which sides of the column to draw the borders.',
                type: 'string',
                inlineJs: true,
                defaultHidden: true
              },
              group: {
                label: 'Column Group',
                description: 'Optionally puts the column in a column group. The value must be a string, which will be displayed above all consecutive columns with the same group property. The column group row will not appear unless at least one column has a group specified.',
                type: 'string',
                inlineJs: true,
                defaultHidden: true
              },
              groupRows: {
                label: 'Group Rows',
                description: 'Optionally combines identical, consecutive values within a column. If set to true, and depending on the sort, repeated values in a column will be combined into a single cell with its rowspan value set. If the rows are separated by a resort, the combined cells will be split apart again. This property can be applied to any column(s) in the table. The default value is false.',
                type: 'boolean',
                "default": false,
                defaultHidden: true
              },
              columnSortFunction: {
                label: 'Column Sort Function',
                description: 'When using wildcard or regex expression in the `name` field, this property optionally provides a sort function used to order the generated columns. This function takes an array of column names and can return a sorted (or modified) array. Example: "${function(columns){return _.sortBy(columns);}}".',
                type: 'string',
                inlineJs: true,
                defaultHidden: true
              },
              columnsIgnored: {
                label: 'Columns Ignored',
                description: 'When using wildcard or regex expression in the `name` field, this can contain a list of one or more column names that should not be matched.',
                type: 'string[]',
                required: false,
                inlineJs: false,
                defaultHidden: true
              }
            },
            order: 10,
            sample: {
              name: ''
            }
          },
          rules: {
            label: 'Rules',
            singleLabel: 'rule',
            description: 'Specifies an array of rules that will be run on each row in the table. Style properties can be set for every matching rule, on either the entire row or a subset of columns.',
            type: 'propertyset[]',
            inlineJs: true,
            properties: {
              rule: {
                label: 'Rule',
                description: 'The rule expression evaluated to determine if this rule applies to a row. It can contain column values using #{name} notation. It will be evaluated as javascript, and should return true or false.',
                type: 'string',
                required: true,
                inlineJs: true,
                order: 1
              },
              columns: {
                label: 'Columns Affected',
                description: 'Optionally specifies an array of column names, limiting the rule\'s effect to only the cells specified, rather than the entire row.',
                type: 'string[]',
                required: false,
                order: 2
              },
              columnsIgnored: {
                label: 'Columns Ignored',
                description: 'Optionally specifies an array of column names that the rule does NOT apply to.',
                type: 'string[]',
                required: false,
                order: 3
              },
              name: {
                label: 'Name',
                description: 'Indicates the name of the data source field to use for this column.',
                type: 'string',
                inlineJs: true,
                defaultHidden: true
              },
              'font-weight': {
                label: 'Font-Weight (CSS)',
                description: 'CSS setting for `font-weight`',
                type: 'string',
                inlineJs: true,
                defaultHidden: true
              },
              color: {
                label: 'Color (CSS)',
                description: 'CSS setting for `color`',
                type: 'string',
                inlineJs: true,
                defaultHidden: true
              },
              'background-color': {
                label: 'Background Color (CSS)',
                description: 'CSS setting for `background-color`',
                type: 'string',
                inlineJs: true,
                defaultHidden: true
              }
            },
            order: 11,
            sample: {
              rule: 'true'
            }
          },
          freezeHeaders: {
            label: 'Freeze Headers',
            description: 'Enables frozen headers at the top of the widget when scrolling',
            type: 'boolean',
            "default": false,
            required: false,
            order: 12
          },
          omitHeaders: {
            label: 'Omit Headers',
            description: 'Disables the table header row',
            type: 'boolean',
            "default": false,
            required: false,
            order: 13
          },
          enableSort: {
            label: 'Enable Sort',
            description: 'Enable or disable user sort controls',
            type: 'boolean',
            "default": true,
            required: false,
            order: 14
          },
          rowHeight: {
            label: 'Minimum Row Height',
            description: 'Specifies the (minimum) height in pixels of all rows (including the header row).  The actual height of a row may be greater than this value, depending on the contents. If this is not set, each row will automatically size to its contents.',
            type: 'integer',
            required: false,
            order: 15
          },
          pagination: {
            label: 'Pagination',
            description: 'Controls pagination of the Table.',
            type: 'propertyset',
            required: false,
            defaultHidden: true,
            order: 16,
            properties: {
              enabled: {
                label: 'Enable Pagination',
                description: 'Enables or disables pagination for this Table Widget.',
                type: 'boolean',
                "default": false,
                required: false,
                order: 1
              },
              autoItemsPerPage: {
                label: 'Auto Items Per Page',
                description: 'Enables automatic detection of the number of rows to display in order to fit in the widget dimensions. Requires rowHeight property to be configured to work accurately. To manually size, set false and configure itemsPerPage instead.',
                type: 'boolean',
                "default": true,
                required: false,
                order: 2
              },
              itemsPerPage: {
                label: 'Items Per Page',
                description: 'Controls how many row are displayed on each page. If autoItemsPerPage is true, this is ignored.',
                type: 'integer',
                required: false,
                order: 3
              },
              belowPagerMessage: {
                label: 'Below Pager Message',
                description: 'If set, displays a message below the pager at the bottom of the Widget. The following variables can be used: #{itemsPerPage}, #{totalItems}, #{currentPage}.',
                type: 'string',
                required: false,
                order: 4
              }
            }
          },
          filters: {
            label: 'Filters',
            description: 'Optional, but if provided, specifies name-value pairs used to filter the data source\'s result set. Each key specifies a column in the data source, and the value specifies either a single value (string) or a set of values (array of strings). Only rows which have the specifies value(s) will be permitted.',
            type: 'hash',
            inlineJsKey: true,
            inlineJsValue: true,
            required: false,
            order: 17
          },
          sortBy: {
            label: 'Sort By',
            description: 'Optional, specifies the field(s) to sort the data by. If the value is a string, it will sort by that single field. If it is an array of strings, multiple fields will be used to sort, with left-to-right priority. The column name can be prefixed with a + or a - sign to indicate the direction or sort. + is ascending, while - is descending. The default sort direction is ascending, so the + sign does not need to be used. If this property is omitted, the original sort order of the data will be used.',
            type: 'string[]',
            inlineJs: true,
            required: false,
            placeholder: 'Column name',
            order: 18
          },
          sortFunction: {
            label: 'Sort Function',
            description: 'Optional, specifies an alternative function to the default sort implementation.',
            placeholder: 'JavaScript Function',
            type: 'editor',
            editorMode: 'javascript',
            required: false,
            defaultHidden: true,
            order: 19
          },
          onSort: {
            label: 'Sort Event',
            description: 'This event occurs when the user changes the sort order of a column. If this property is set with a JavaScript function, the function will be called as an event handler. Return false from the function to prevent the default sort implementation from being applied.',
            type: 'editor',
            editorMode: 'javascript',
            required: false,
            defaultHidden: true,
            order: 20
          }
        }
      },
      tableau: {
        name: 'tableau',
        label: 'Tableau',
        icon: 'fa-cog',
        properties: {
          params: {
            label: 'Parameters',
            description: 'An object of key-value pairs that Tableau uses to render the report. These parameters are specific to Tableau and will be passed-through to the view.',
            type: 'hash',
            required: true,
            editorMode: 'json',
            order: 10
          }
        }
      },
      treemap: {
        name: 'treemap',
        label: 'Treemap',
        icon: 'fa-tree',
        properties: {
          dataSource: {
            label: 'Data Source',
            description: 'The name of the Data Source providing data for this Widget.',
            placeholder: 'Data Source name',
            type: 'string',
            required: true,
            options: datasourceOptions,
            order: 10
          },
          labelProperty: {
            label: 'Label Property',
            description: 'The name of the property to use as the label of each item.',
            type: 'string',
            inlineJs: true,
            required: false,
            "default": 'name',
            defaultHidden: true,
            order: 11
          },
          valueProperty: {
            label: 'Value Property',
            description: 'The name of the property to use to calculate the size of each item.',
            type: 'string',
            inlineJs: true,
            required: false,
            "default": 'value',
            defaultHidden: true,
            order: 12
          },
          valueDescription: {
            label: 'Value Description',
            description: 'A short description of the property used to calculate the size of each item. Used in tooltips.',
            type: 'string',
            inlineJs: true,
            required: false,
            defaultHidden: true,
            order: 13
          },
          valueFormat: {
            label: 'Value Format',
            description: 'Specifies a Numeral.js-compatible format string used to format the label of the size value.',
            type: 'string',
            "default": ',.2f',
            required: false,
            defaultHidden: true,
            inlineJs: true,
            options: {
              "default": {
                value: '0,0.[0]'
              },
              percent: {
                value: '0,0%'
              },
              integer: {
                value: '0,0'
              },
              currency: {
                value: '$0,0'
              }
            },
            order: 14
          },
          colorProperty: {
            label: 'Color Property',
            description: 'The name of the property to use to calculate the color of each item. If omitted, the TreeMap will not be colored.',
            type: 'string',
            inlineJs: true,
            required: false,
            "default": 'color',
            order: 15
          },
          colorDescription: {
            label: 'Color Description',
            description: 'A short description of the property used to calculate the color of each item. Used in tooltips.',
            type: 'string',
            inlineJs: true,
            required: false,
            defaultHidden: true,
            order: 16
          },
          colorFormat: {
            label: 'Color Format',
            description: 'Specifies a Numeral.js-compatible format string used to format the label of the color value.',
            type: 'string',
            "default": ',.2f',
            required: false,
            defaultHidden: true,
            inlineJs: true,
            options: {
              "default": {
                value: '0,0.[0]'
              },
              percent: {
                value: '0,0%'
              },
              integer: {
                value: '0,0'
              },
              currency: {
                value: '$0,0'
              },
              large: {
                value: '0a'
              }
            },
            order: 17
          },
          colorStops: {
            label: 'Color Stops',
            singleLabel: 'color',
            description: 'Specifies a list of color stops used to build a gradient.',
            type: 'propertyset[]',
            inlineJs: true,
            properties: {
              value: {
                label: 'Value',
                description: 'The numerical value assigned to this color stop.',
                type: 'number',
                required: true,
                inlineJs: true,
                order: 1
              },
              color: {
                label: 'Color',
                description: 'The color to display at this color stop. Hex codes or CSS colors are permitted.',
                type: 'string',
                required: false,
                inlineJs: true,
                order: 2
              }
            },
            order: 18
          },
          showLegend: {
            label: 'Show Legend',
            description: 'Enables or disables the color legend.',
            type: 'boolean',
            "default": true,
            required: false,
            order: 19
          },
          legendHeight: {
            label: 'Legend Height',
            description: 'Specifies the height of the legend in pixels.',
            type: 'number',
            "default": 30,
            required: false,
            defaultHidden: true,
            order: 20
          }
        }
      },
      youtube: {
        name: 'youtube',
        label: 'YouTube',
        icon: 'fa-youtube',
        properties: {
          videoId: {
            label: 'Video / Playlist ID',
            description: 'A YouTube video ID or Playlist ID. Multiple video IDs can be separated by commas.',
            type: 'string',
            inlineJs: true,
            placeholder: 'ID',
            required: true,
            order: 10
          },
          autoplay: {
            label: 'Auto-Play',
            description: 'If true, automatically plays the video when the Widget is loaded.',
            type: 'boolean',
            inlineJs: true,
            "default": true,
            required: false,
            order: 13
          },
          loop: {
            label: 'Loop',
            description: 'If true, automatically loops the video when it completes.',
            type: 'boolean',
            inlineJs: true,
            "default": true,
            required: false,
            order: 14
          },
          enableKeyboard: {
            label: 'Enable Keyboard',
            description: 'If true, enables keyboard controls which are disabled by default.',
            type: 'boolean',
            inlineJs: true,
            "default": false,
            required: false,
            defaultHidden: true,
            order: 15
          },
          enableControls: {
            label: 'Enable Controls',
            description: 'If true, enables on-screen video controls which are disabled by default.',
            type: 'boolean',
            inlineJs: true,
            "default": false,
            required: false,
            defaultHidden: true,
            order: 16
          },
          showAnnotations: {
            label: 'Show Annotations',
            description: 'If true, displays available annotations over the video.',
            type: 'boolean',
            inlineJs: true,
            "default": false,
            required: false,
            defaultHidden: true,
            order: 17
          },
          showRelated: {
            label: 'Show Related',
            description: 'If true, displays related videos at the end of this video.',
            type: 'boolean',
            inlineJs: true,
            "default": false,
            required: false,
            defaultHidden: true,
            order: 18
          }
        }
      }
    }
  };
  exports.dashboard.properties.pages.properties.theme.options = exports.dashboard.properties.theme.options;
  exports.dashboard.properties.pages.properties.widgets.properties.theme.options = exports.dashboard.properties.theme.options;
  exports.dashboard.properties.pages.properties.themeVariant.options = exports.dashboard.properties.themeVariant.options;
  exports.dashboard.properties.pages.properties.widgets.properties.themeVariant.options = exports.dashboard.properties.themeVariant.options;
  exports.dashboard.properties.pages.properties.style.options = exports.dashboard.properties.style.options;
  tableProperties = exports.widgets.table.properties;
  _.defaults(tableProperties.rules.properties, _.omit(tableProperties.columns.properties, 'label'));
  exports.widgets.chart.themes.lightborderless = exports.widgets.chart.themes.light;
  helpDashboards = _.find(exports.help, {
    name: 'Dashboards'
  });
  helpDashboards.tags = _.union(helpDashboards.tags, _.map(exports.dashboard.properties, function(value, name) {
    return name;
  }));
  helpDataSources = _.find(exports.help, {
    name: 'Data Sources'
  });
  helpDataSources.tags = _.union(helpDataSources.tags, _.map(exports.dashboard.properties.dataSources.properties, function(value, name) {
    return name;
  }));
  helpWidgets = _.find(exports.help, {
    name: 'Widgets'
  });
  helpWidgets.tags = _.union(helpWidgets.tags, _.map(exports.dashboard.properties.pages.properties.widgets.properties, function(value, name) {
    return name;
  }));
  propertyMapHelper = function(value, name) {
    var v;
    v = _.cloneDeep(value);
    v.name = name;
    return v;
  };
  helpDataSources.children = _.map(_.sortBy(exports.dashboard.properties.dataSources.options, 'name'), function(dataSource) {
    return {
      name: dataSource.label || dataSource.value,
      path: '/partials/help/datasources/' + dataSource.value + '.html',
      tags: _.map(dataSource.properties, propertyMapHelper)
    };
  });
  helpWidgets.children = _.map(_.sortBy(exports.widgets, 'name'), function(widget) {
    return {
      name: widget.label || widget.name,
      path: '/widgets/' + widget.name + '/help.html',
      tags: _.map(widget.properties, propertyMapHelper)
    };
  });
  return exports;
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
cyclotronServices.factory('dashboardService', ['$http', '$resource', '$q', 'analyticsService', 'configService', 'userService', function($http, $resource, $q, analyticsService, configService, userService) {
  var baseUrl, beautifyOptions, dashboardResource, defaultActions, frequencyCount, likesResource, newDashboardTemplate, newDataSourceTemplate, newPageTemplate, newParameterTemplate, newScriptTemplate, newStyleTemplate, newWidgetTemplate, pageRegex, revisionResource, revisionsResource, service, superStringify, tagsResource;
  baseUrl = configService.restServiceUrl.replace(/:(?!\/\/)/gi, '\\:');
  defaultActions = {
    get: {
      method: 'GET'
    },
    save: {
      method: 'POST'
    },
    save2: {
      method: 'POST',
      isArray: true
    },
    update: {
      method: 'PUT'
    },
    updateArray: {
      method: 'PUT',
      isArray: true
    },
    query: {
      method: 'GET',
      isArray: true
    },
    remove: {
      method: 'DELETE'
    },
    'delete': {
      method: 'DELETE'
    },
    'delete2': {
      method: 'DELETE',
      isArray: true
    }
  };
  dashboardResource = $resource(baseUrl + '/dashboards/:name', {}, defaultActions);
  revisionsResource = $resource(baseUrl + '/dashboards/:name/revisions', {}, defaultActions);
  revisionResource = $resource(baseUrl + '/dashboards/:name/revisions/:rev', {}, defaultActions);
  tagsResource = $resource(baseUrl + '/dashboards/:name/tags', {}, defaultActions);
  likesResource = $resource(baseUrl + '/dashboards/:name/likes', {}, defaultActions);
  beautifyOptions = {
    indent_size: 4
  };
  pageRegex = /\"?pages\"?\s*:/;
  newDashboardTemplate = function() {
    return _.cloneDeep(configService.dashboard.sample);
  };
  newPageTemplate = function() {
    return _.cloneDeep(configService.page.sample);
  };
  newWidgetTemplate = function(widgetName) {
    var template;
    if (widgetName == null) {
      return {
        widget: ""
      };
    }
    template = _.cloneDeep(configService.widgets[widgetName].sample) || {};
    template.widget = widgetName;
    return template;
  };
  newDataSourceTemplate = function(dataSourceType, index) {
    var template;
    template = {
      name: 'datasource_' + index
    };
    if (dataSourceType != null) {
      template.type = dataSourceType;
    }
    return template;
  };
  newParameterTemplate = function() {
    return _.cloneDeep(configService.dashboard.properties.parameters.sample);
  };
  newScriptTemplate = function() {
    return _.cloneDeep(configService.dashboard.properties.scripts.sample);
  };
  newStyleTemplate = function() {
    return _.cloneDeep(configService.dashboard.properties.styles.sample);
  };
  frequencyCount = {};
  superStringify = function(obj) {
    var inner, pairs, sortedPairs;
    if (_.isArray(obj)) {
      inner = _.reduce(obj, function(inner, el) {
        if (inner !== '') {
          inner += ',';
        }
        return inner += superStringify(el);
      }, '');
      return '[' + inner + ']';
    }
    if (_.isObject(obj)) {
      pairs = _.reject(_.pairs(obj), function(p) {
        return _.isFunction(p[1]);
      });
      sortedPairs = _.sortBy(pairs, function(p) {
        return p[0];
      });
      inner = _.reduce(sortedPairs, function(inner, p) {
        if (inner !== '') {
          inner += ',';
        }
        return inner += '"' + p[0] + '": ' + superStringify(p[1]);
      }, '');
      return '{' + inner + '}';
    }
    return JSON.stringify(obj);
  };
  service = {};
  service.dashboards = function() {
    return dashboardResource;
  };
  service.getDashboards = function(query) {
    var deferred, p;
    deferred = $q.defer();
    p = dashboardResource.query({
      q: query
    }).$promise;
    p.then(function(dashboards) {
      return deferred.resolve(dashboards);
    });
    p["catch"](function(error) {
      alertify.error((error != null ? error.data : void 0) || 'Cannot connect to cyclotron-svc (getDashboards)', 2500);
      return deferred.reject(error);
    });
    return deferred.promise;
  };
  service.getDashboard = function(dashboardName, rev) {
    var deferred, p, ref, ref1;
    deferred = $q.defer();
    p = (_.isEmpty(rev) ? dashboardResource.get({
      name: dashboardName,
      session: (ref = userService.currentSession()) != null ? ref.key : void 0
    }) : revisionResource.get({
      name: dashboardName,
      rev: rev,
      session: (ref1 = userService.currentSession()) != null ? ref1.key : void 0
    })).$promise;
    p.then(function(dashboard) {
      return deferred.resolve(dashboard);
    });
    p["catch"](function(error) {
      return deferred.reject(error);
    });
    return deferred.promise;
  };
  service.save = function(dashboard) {
    var deferred, doSave;
    deferred = $q.defer();
    doSave = function() {
      var p, ref;
      p = dashboardResource.save({
        session: (ref = userService.currentSession()) != null ? ref.key : void 0
      }, dashboard).$promise;
      p.then(function() {
        analyticsService.recordEvent('createDashboard', {
          dashboardName: dashboard.name
        });
        alertify.log('Created Dashboard', 2500);
        return deferred.resolve();
      });
      return p["catch"](function(error) {
        if (error.status === 401) {
          alertify.error('Session expired, please login again');
          alertify.error('Cannot create Dashboard');
          userService.setLoggedOut();
        } else {
          alertify.error(error.data, 2500);
        }
        return deferred.reject(error);
      });
    };
    if (userService.hasEditPermission(dashboard)) {
      doSave();
    } else {
      alertify.confirm('The Edit Permissions have been modified to exclude yourself.  Are you sure you want to save these changes?', function(e) {
        if (e) {
          return doSave();
        } else {
          return deferred.reject('Cancelled');
        }
      });
    }
    return deferred.promise;
  };
  service.update = function(dashboard) {
    var deferred, doUpdate;
    deferred = $q.defer();
    doUpdate = function() {
      var p, ref;
      p = dashboardResource.update({
        name: dashboard.name,
        session: (ref = userService.currentSession()) != null ? ref.key : void 0
      }, dashboard).$promise;
      p.then(function() {
        analyticsService.recordEvent('modifyDashboard', {
          dashboardName: dashboard.name,
          rev: dashboard.rev
        });
        alertify.log('Saved Dashboard', 2500);
        return deferred.resolve();
      });
      return p["catch"](function(error) {
        switch (error.status) {
          case 401:
            alertify.error('Session expired, please login again');
            alertify.error('Dashboard not saved');
            userService.setLoggedOut();
            break;
          case 403:
            alertify.error('You don\'t have permission to edit this Dashboard');
            break;
          default:
            alertify.error(error.data, 2500);
        }
        return deferred.reject(error);
      });
    };
    if (userService.hasEditPermission(dashboard)) {
      doUpdate();
    } else {
      alertify.confirm('The Edit Permissions have been modified to exclude yourself.  Are you sure you want to save these changes?', function(e) {
        if (e) {
          return doUpdate();
        } else {
          return deferred.reject('Cancelled');
        }
      });
    }
    return deferred.promise;
  };
  service["delete"] = function(name) {
    var deferred, p, ref;
    deferred = $q.defer();
    p = dashboardResource["delete"]({
      name: name,
      session: (ref = userService.currentSession()) != null ? ref.key : void 0
    }).$promise;
    p.then(function(dashboard) {
      analyticsService.recordEvent('deleteDashboard', {
        dashboardName: dashboard.name
      });
      alertify.log('Deleted Dashboard', 2500);
      return deferred.resolve(dashboard);
    });
    p["catch"](function(error) {
      switch (error.status) {
        case 401:
          alertify.error('Session expired, please login again');
          alertify.error('Dashboard not deleted');
          userService.setLoggedOut();
          break;
        case 403:
          alertify.error("You don't have permission to delete this Dashboard");
          break;
        default:
          alertify.error(error.data, 2500);
      }
      return deferred.reject(error);
    });
    return deferred.promise;
  };
  service.getRevisions = function(dashboardName) {
    var deferred, p;
    deferred = $q.defer();
    p = revisionsResource.query({
      name: dashboardName
    }).$promise;
    p.then(function(dashboards) {
      return deferred.resolve(dashboards);
    });
    p["catch"](function(error) {
      alertify.error((error != null ? error.data : void 0) || 'Cannot connect to cyclotron-svc (getRevisions)', 2500);
      return deferred.reject(error);
    });
    return deferred.promise;
  };
  service.getRevisionDiff = function(dashboardName, rev1, rev2) {
    var deferred, url;
    deferred = $q.defer();
    url = configService.restServiceUrl + '/dashboards/' + dashboardName + '/revisions/' + rev1 + '/diff/' + rev2;
    $http.get(url).then(function(response) {
      return deferred.resolve(response.data);
    })["catch"](function(error) {
      alertify.error((error != null ? error.data : void 0) || 'Cannot connect to cyclotron-svc (getRevisionDiff)', 2500);
      return deferred.reject(error);
    });
    return deferred.promise;
  };
  service.getRevision = function(dashboardName, rev) {
    var deferred, p, ref;
    deferred = $q.defer();
    p = revisionResource.get({
      name: dashboardName,
      rev: rev,
      session: (ref = userService.currentSession()) != null ? ref.key : void 0
    }).$promise;
    p.then(function(revision) {
      return deferred.resolve(revision);
    });
    p["catch"](function(error) {
      alertify.error((error != null ? error.data : void 0) || 'Cannot connect to cyclotron-svc (getRevision)', 2500);
      return deferred.reject(error);
    });
    return deferred.promise;
  };
  service.like = function(dashboard) {
    var p, ref;
    p = likesResource.save2({
      name: dashboard.name,
      session: (ref = userService.currentSession()) != null ? ref.key : void 0
    }, null).$promise;
    p.then(function() {
      analyticsService.recordEvent('like', {
        dashboardName: dashboard.name
      });
      alertify.log('Liked Dashboard', 2500);
    });
    return p["catch"](function(error) {
      switch (error.status) {
        case 401:
          alertify.error('Session expired, please login again');
          return userService.setLoggedOut();
        default:
          return alertify.error(error.data, 2500);
      }
    });
  };
  service.unlike = function(dashboard) {
    var p, ref;
    p = likesResource.delete2({
      name: dashboard.name,
      session: (ref = userService.currentSession()) != null ? ref.key : void 0
    }).$promise;
    p.then(function() {
      analyticsService.recordEvent('unlike', {
        dashboardName: dashboard.name
      });
      alertify.log('Unliked Dashboard', 2500);
    });
    return p["catch"](function(error) {
      switch (error.status) {
        case 401:
          alertify.error('Session expired, please login again');
          return userService.setLoggedOut();
        default:
          return alertify.error(error.data, 2500);
      }
    });
  };
  service.pushToService = function(dashboardWrapper, serviceUri, sessionKey) {
    var targetResource;
    targetResource = $resource(serviceUri + '/dashboards/:name', {
      session: sessionKey
    }, defaultActions);
    return targetResource.update({
      name: dashboardWrapper.name
    }, dashboardWrapper).$promise;
  };
  service.setDashboardDefaults = function(dashboard) {
    var queue, setDefaults;
    queue = [];
    setDefaults = function() {
      var obj, parent, properties, ref;
      ref = queue.shift(), obj = ref[0], properties = ref[1], parent = ref[2];
      return _.each(properties, function(property, name) {
        if (obj[name] == null) {
          if (property.inherit === true && (parent != null)) {
            obj[name] = parent[name];
          } else if (property["default"] != null) {
            obj[name] = property["default"];
          }
        }
        if (property.type === 'propertyset') {
          queue.push([obj[name], property.properties, obj]);
        } else if (property.type === 'propertyset[]' || property.type === 'pages' || property.type === 'datasources') {
          _.each(obj[name], function(o) {
            queue.push([o, property.properties, obj]);
          });
        }
      });
    };
    queue.push([dashboard, configService.dashboard.properties, null]);
    while (queue.length !== 0) {
      setDefaults();
    }
    return dashboard;
  };
  service.getThemes = function(dashboard) {
    var themes;
    themes = [];
    if (dashboard.theme != null) {
      themes.push(dashboard.theme);
    }
    if (_.isNullOrUndefined(dashboard.pages)) {
      return themes;
    }
    _.each(dashboard.pages, function(page) {
      themes.push(page.theme);
      if (_.isNullOrUndefined(page.widgets)) {
        return;
      }
      return _.each(page.widgets, function(widget) {
        return themes.push(widget.theme);
      });
    });
    return _.unique(_.compact(themes));
  };
  service.parse = function(dashboardText) {
    dashboardText = dashboardText.replace(/\r\n|\n\r|\t\t|\t\t\t/g, ' ');
    dashboardText = dashboardText.replace(/\r|\n|\t/g, ' ');
    return eval('(' + dashboardText + ')');
  };
  service.toString = function(dashboard) {
    var dashboard2;
    if (dashboard == null) {
      return '';
    }
    dashboard2 = angular.copy(dashboard);
    return js_beautify(superStringify(dashboard2), beautifyOptions);
  };
  service.newDashboard = function() {
    return newDashboardTemplate();
  };
  service.addPage = function(dashboard) {
    if (dashboard.pages == null) {
      dashboard.pages = [];
    }
    dashboard.pages.push(newPageTemplate());
    return dashboard;
  };
  service.removePage = function(dashboard, pageIndex) {
    if ((dashboard.pages != null) && pageIndex >= 0) {
      dashboard.pages.splice(pageIndex, 1);
    }
    return dashboard;
  };
  service.addDataSource = function(dashboard, dataSourceType) {
    if (dashboard.dataSources == null) {
      dashboard.dataSources = [];
    }
    dashboard.dataSources.push(newDataSourceTemplate(dataSourceType, dashboard.dataSources.length));
    return dashboard;
  };
  service.removeDataSource = function(dashboard, dataSourceIndex) {
    if ((dashboard.dataSources != null) && dataSourceIndex >= 0) {
      dashboard.dataSources.splice(dataSourceIndex, 1);
    }
    return dashboard;
  };
  service.addParameter = function(dashboard) {
    if (dashboard.parameters == null) {
      dashboard.parameters = [];
    }
    dashboard.parameters.push(newParameterTemplate());
    return dashboard;
  };
  service.removeParameter = function(dashboard, parameterIndex) {
    if ((dashboard.parameters != null) && parameterIndex >= 0) {
      dashboard.parameters.splice(parameterIndex, 1);
    }
    return dashboard;
  };
  service.addScript = function(dashboard) {
    if (dashboard.scripts == null) {
      dashboard.scripts = [];
    }
    dashboard.scripts.push(newScriptTemplate());
    return dashboard;
  };
  service.removeScript = function(dashboard, index) {
    if ((dashboard.scripts != null) && index >= 0) {
      dashboard.scripts.splice(index, 1);
    }
    return dashboard;
  };
  service.addStyle = function(dashboard) {
    if (dashboard.styles == null) {
      dashboard.styles = [];
    }
    dashboard.styles.push(newStyleTemplate());
    return dashboard;
  };
  service.removeStyle = function(dashboard, index) {
    if ((dashboard.styles != null) && index >= 0) {
      dashboard.styles.splice(index, 1);
    }
    return dashboard;
  };
  service.addWidget = function(dashboard, widgetName, pageIndex) {
    var page;
    if ((!dashboard.pages) || (dashboard.pages.length === 0)) {
      service.addPage(dashboard);
    }
    page = pageIndex != null ? dashboard.pages[pageIndex] : _.last(dashboard.pages);
    if (!page.widgets) {
      page.widgets = [];
    }
    page.widgets.push(newWidgetTemplate(widgetName));
    return dashboard;
  };
  service.removeWidget = function(dashboard, widgetIndex, pageIndex) {
    var page;
    if ((dashboard.pages != null) && widgetIndex >= 0 && pageIndex >= 0 && pageIndex < dashboard.pages.length) {
      page = dashboard.pages[pageIndex];
      page.widgets.splice(widgetIndex, 1);
    }
    return dashboard;
  };
  service.rotate = function(dashboard, currentPageIndex) {
    var doRotate;
    doRotate = function() {
      var page;
      ++currentPageIndex;
      if (currentPageIndex === dashboard.pages.length) {
        currentPageIndex = 0;
      }
      page = dashboard.pages[currentPageIndex];
      if (frequencyCount[currentPageIndex] != null) {
        ++frequencyCount[currentPageIndex];
      } else {
        frequencyCount[currentPageIndex] = 1;
      }
      if (frequencyCount[currentPageIndex] > page.frequency) {
        frequencyCount[currentPageIndex] = 1;
      }
      if (frequencyCount[currentPageIndex] !== page.frequency) {
        return doRotate();
      }
    };
    doRotate();
    return currentPageIndex;
  };
  service.getDataSource = function(dashboard, widget, propertyName) {
    var dataSourceDefinition, dataSourceNameParts;
    if (propertyName == null) {
      propertyName = 'dataSource';
    }
    if (_.isNullOrUndefined(widget)) {
      return;
    }
    if (_.isNullOrUndefined(dashboard)) {
      return;
    }
    if (widget[propertyName] == null) {
      return;
    }
    dataSourceDefinition = widget[propertyName];
    if (_.isString(dataSourceDefinition) && (dashboard.dataSources != null)) {
      dataSourceNameParts = /([^\[]*)(\[(.*?)\])?/.exec(dataSourceDefinition);
      dataSourceDefinition = _.find(dashboard.dataSources, {
        name: dataSourceNameParts[1]
      });
      if (dataSourceNameParts[3] != null) {
        dataSourceDefinition = _.cloneDeep(dataSourceDefinition);
        dataSourceDefinition.resultSet = dataSourceNameParts[3];
      }
    }
    if (dataSourceDefinition == null) {
      return;
    }
    if (dataSourceDefinition.type == null) {
      return;
    }
    return dataSourceDefinition;
  };
  service.updateTags = function(dashboardName, tags) {
    return tagsResource.updateArray({
      name: dashboardName
    }, tags);
  };
  service.getPageName = function(page, index) {
    var pageName;
    if ((page != null ? page.name : void 0) != null) {
      pageName = page.name.trim();
    }
    if (_.isEmpty(pageName)) {
      return 'Page ' + (index + 1);
    } else {
      return pageName;
    }
  };
  service.getWidgetName = function(widget, index) {
    var ref, ref1;
    if ((widget.widget == null) || widget.widget === '') {
      return 'Widget ' + (index + 1);
    }
    if ((widget != null ? (ref = widget.name) != null ? ref.length : void 0 : void 0) > 0) {
      return _.titleCase(widget.widget) + ': ' + widget.name;
    } else if (((ref1 = widget.title) != null ? ref1.length : void 0) > 0) {
      return _.titleCase(widget.widget) + ': ' + widget.title;
    } else {
      return _.titleCase(widget.widget);
    }
  };
  service.getVisitCategory = function(dashboard) {
    var icon, text, visits;
    if (dashboard == null) {
      return null;
    }
    visits = dashboard.visits;
    icon = 'fa-user';
    text = (function() {
      switch (false) {
        case !(visits >= 10000):
          icon = 'fa-users';
          return '10,000+';
        case !(visits >= 1000):
          return '1,000+';
        case !(visits >= 100):
          return '100+';
        case !(visits >= 10):
          return '10+';
        default:
          return visits;
      }
    })();
    return {
      text: text,
      icon: icon
    };
  };
  return service;
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
cyclotronServices.factory('focusService', ['$timeout', function($timeout) {
  return {
    focus: function(name, scope) {
      return $timeout(function() {
        return scope.$broadcast('focusOn', name);
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
cyclotronServices.factory('loadService', ['configService', '$rootScope', function(configService, $rootScope) {
  return {
    setTitle: function(title) {
      return $rootScope.page_title = title;
    },
    removeLoadedCss: function() {
      return $('.loadServiceAsset.temporary').remove();
    },
    loadCssUrl: function(url, permanent) {
      var link;
      if (permanent == null) {
        permanent = false;
      }
      link = document.createElement("link");
      link.type = "text/css";
      link.rel = "stylesheet";
      link.href = url;
      link.className = 'loadServiceAsset';
      if (!permanent) {
        link.className += ' temporary';
      }
      return document.getElementsByTagName("head")[0].appendChild(link);
    },
    loadCssInline: function(css, permanent) {
      var style;
      if (permanent == null) {
        permanent = false;
      }
      style = document.createElement("style");
      style.type = 'text/css';
      style.className = 'loadServiceAsset';
      if (!permanent) {
        style.className += ' temporary';
      }
      if (style.styleSheet) {
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(document.createTextNode(css));
      }
      return document.head.appendChild(style);
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
cyclotronServices.factory('logService', ['$window', 'configService', function($window, configService) {
  var getString, now, ref, service, writeError, writeLog;
  now = function() {
    return $window.moment().format('HH:mm:ss');
  };
  getString = function(obj) {
    if (_.isObject(obj)) {
      return JSON.stringify(obj);
    } else {
      return obj;
    }
  };
  writeLog = function(args) {
    return $window.console.log('[' + now() + '] ' + _.map(args, getString).join(' '));
  };
  writeError = function(args) {
    return $window.console.error('[' + now() + '] ' + _.map(args, getString).join(' '));
  };
  service = {
    debug: function() {
      var args;
      args = Array.prototype.slice.call(arguments);
      args.unshift('DEBUG:');
      return writeLog(args);
    },
    info: function() {
      var args;
      args = Array.prototype.slice.call(arguments);
      args.unshift('INFO:');
      return writeLog(args);
    },
    error: function() {
      var args;
      args = Array.prototype.slice.call(arguments);
      args.unshift('ERROR:');
      return writeError(args);
    }
  };
  if (((ref = configService.logging) != null ? ref.enableDebug : void 0) === false) {
    service.debug = function() {};
  }
  return service;
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
cyclotronServices.factory('userService', ['$http', '$localForage', '$q', '$rootScope', '$window', 'configService', 'logService', function($http, $localForage, $q, $rootScope, $window, configService, logService) {
  var currentSession, exports, loggedIn;
  loggedIn = false;
  currentSession = null;
  exports = {
    authEnabled: configService.authentication.enable,
    cachedUserId: null,
    cachedUsername: null,
    isLoggedIn: function() {
      if (!configService.authentication.enable) {
        return true;
      }
      return loggedIn && (currentSession != null);
    },
    isAdmin: function() {
      var ref;
      return (currentSession != null ? (ref = currentSession.user) != null ? ref.admin : void 0 : void 0) === true;
    },
    currentSession: function() {
      return currentSession;
    },
    currentUser: function() {
      return currentSession != null ? currentSession.user : void 0;
    },
    setLoggedOut: function() {
      loggedIn = false;
      return currentSession = null;
    },
    isNewUser: true,
    notNewUser: function(update) {
      if (update == null) {
        update = true;
      }
      if (!exports.isNewUser) {
        return;
      }
      return $localForage.setItem('newUser', 0).then(function() {
        if (update) {
          exports.isNewUser = false;
        }
        return logService.debug('User is not longer a New User');
      });
    }
  };
  $localForage.getItem('username').then(function(username) {
    if (username != null) {
      return exports.cachedUsername = username;
    }
  });
  $localForage.getItem('cachedUserId').then(function(userId) {
    if (userId != null) {
      return exports.cachedUserId = userId;
    }
  });
  $localForage.getItem('newUser').then(function(value) {
    if (value === 0) {
      logService.debug('User is definitely not a New User');
      return exports.isNewUser = false;
    } else if (value > 0) {
      return logService.debug('User is definitely a New User');
    } else {
      logService.debug('User is probably a New User');
      return $localForage.setItem('newUser', 1);
    }
  });
  exports.login = function(username, password) {
    var deferred, post;
    if (_.isEmpty(username) || _.isEmpty(password)) {
      return;
    }
    post = $http.post(configService.restServiceUrl + '/users/login', {
      username: username,
      password: password
    });
    deferred = $q.defer();
    post.success(function(session) {
      currentSession = session;
      $localForage.setItem('session', session);
      $localForage.setItem('username', username);
      $localForage.setItem('cachedUserId', session.user._id);
      exports.cachedUsername = username;
      exports.cachedUserId = session.user._id;
      loggedIn = true;
      $rootScope.$broadcast('login', {});
      if ($window.Cyclotron != null) {
        $window.Cyclotron.currentUser = session.user;
      }
      alertify.success('Logged in as <strong>' + session.user.name + '</strong>', 2500);
      return deferred.resolve(session);
    });
    post.error(function(error) {
      exports.setLoggedOut();
      return deferred.reject(error);
    });
    return deferred.promise;
  };
  exports.loadExistingSession = function(hideAlerts) {
    var deferred, errorHandler;
    if (hideAlerts == null) {
      hideAlerts = false;
    }
    if (currentSession != null) {
      return currentSession;
    }
    deferred = $q.defer();
    errorHandler = function() {
      exports.setLoggedOut();
      return deferred.resolve(null);
    };
    if (configService.authentication.enable === true) {
      $localForage.getItem('session').then(function(existingSession) {
        var validator;
        if (existingSession != null) {
          validator = $http.post(configService.restServiceUrl + '/users/validate', {
            key: existingSession.key
          });
          validator.success(function(session) {
            currentSession = session;
            loggedIn = true;
            if (!hideAlerts) {
              alertify.log('Logged in as <strong>' + session.user.name + '</strong>', 2500);
            }
            return deferred.resolve(session);
          });
          return validator.error(function(error) {
            $localForage.removeItem('session');
            if (!hideAlerts) {
              alertify.log('Previous session expired', 2500);
            }
            return errorHandler();
          });
        } else {
          return errorHandler();
        }
      }, errorHandler);
    } else {
      errorHandler();
    }
    return deferred.promise;
  };
  exports.logout = function() {
    var deferred, promise;
    deferred = $q.defer();
    if (currentSession != null) {
      promise = $http.post(configService.restServiceUrl + '/users/logout', {
        key: currentSession.key
      });
      promise.success(function() {
        exports.setLoggedOut();
        $localForage.removeItem('session');
        $rootScope.$broadcast('logout');
        if ($window.Cyclotron != null) {
          $window.Cyclotron.currentUser = null;
        }
        alertify.log('Logged Out', 2500);
        return deferred.resolve();
      });
      promise.error(function(error) {
        alertify.error('Error during logout', 2500);
        return deferred.reject();
      });
    }
    return deferred.promise;
  };
  exports.search = function(query) {
    var deferred, promise;
    deferred = $q.defer();
    promise = $http.get(configService.restServiceUrl + '/ldap/search', {
      params: {
        q: query
      }
    });
    promise.success(function(results) {
      return deferred.resolve(results);
    });
    promise.error(function(error) {
      logService.error('UserService error: ' + error);
      return deferred.reject();
    });
    return deferred.promise;
  };
  exports.hasEditPermission = function(dashboard) {
    if (!configService.authentication.enable) {
      return true;
    }
    if (!exports.isLoggedIn()) {
      return false;
    }
    if (exports.isAdmin()) {
      return true;
    }
    if (_.isEmpty(dashboard != null ? dashboard.editors : void 0)) {
      return true;
    }
    return _.any(dashboard.editors, function(editor) {
      return (currentSession.user.distinguishedName === editor.dn) || _.contains(currentSession.user.memberOf, editor.dn);
    });
  };
  exports.hasViewPermission = function(dashboard) {
    if (!configService.authentication.enable) {
      return true;
    }
    if (!exports.isLoggedIn()) {
      return true;
    }
    if (exports.isAdmin()) {
      return true;
    }
    if (_.isEmpty(dashboard != null ? dashboard.viewers : void 0)) {
      return true;
    }
    if (exports.hasEditPermission(dashboard)) {
      return true;
    }
    return _.any(dashboard.viewers, function(viewer) {
      return (currentSession.user.distinguishedName === viewer.dn) || _.contains(currentSession.user.memberOf, viewer.dn);
    });
  };
  exports.likesDashboard = function(dashboard) {
    if (!configService.authentication.enable) {
      return false;
    }
    if (!exports.isLoggedIn()) {
      return false;
    }
    return _.contains(dashboard.likes, currentSession.user._id);
  };
  return exports;
}]);
