Feature: Reporting unhandled errors

Scenario: Catching an Unhandled error
  When I run "UnhandledJsErrorScenario" and relaunch the app
  And I configure Bugsnag for "UnhandledJsErrorScenario"
  Then I wait to receive a request
  And the exception "errorClass" equals "Error"
  And the exception "type" equals "reactnativejs"
  And the event "unhandled" is true
  And the exception "message" equals "UnhandledJsErrorScenario"

Scenario: Catching an Unhandled promise rejection
  When I run "UnhandledJsPromiseRejectionScenario" and relaunch the app
  And I configure Bugsnag for "UnhandledJsPromiseRejectionScenario"
  Then I wait to receive a request
  And the exception "errorClass" equals "Error"
  And the exception "type" equals "reactnativejs"
  And the event "unhandled" is true
  And the exception "message" equals "UnhandledJsPromiseRejectionScenario"

Scenario: Catching an Unhandled Native error
  When I run "UnhandledNativeErrorScenario" and relaunch the app
  And I configure Bugsnag for "UnhandledNativeErrorScenario"
  Then I wait to receive a request
  And the event "exceptions.0.errorClass" equals the platform-dependent string:
  | android | java.lang.RuntimeException |
  | ios     | NSException                |
  And the event "exceptions.0.type" equals the platform-dependent string:
  | android | android |
  | ios     | cocoa   |
  And the event "unhandled" is true
  And the exception "message" equals "UnhandledNativeErrorScenario"

Scenario: Updating severity on an unhandled JS error
  When I run "UnhandledJsErrorSeverityScenario" and relaunch the app
  And I configure Bugsnag for "UnhandledJsErrorSeverityScenario"
  Then I wait to receive a request
  And the exception "errorClass" equals "Error"
  And the exception "message" equals "UnhandledJsErrorSeverityScenario"
  And the event "unhandled" is true
  And the event "severity" equals "info"
