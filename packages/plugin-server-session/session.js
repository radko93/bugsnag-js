const { includes } = require('@bugsnag/core/lib/es-utils')
const inferReleaseStage = require('@bugsnag/core/lib/infer-release-stage')
const { intRange } = require('@bugsnag/core/lib/validators')
const clone = require('@bugsnag/core/lib/clone-client')
const SessionTracker = require('./tracker')
const Backoff = require('backo')
const runSyncCallbacks = require('@bugsnag/core/lib/sync-callback-runner')

module.exports = {
  init: (client) => {
    const sessionTracker = new SessionTracker(client._config.sessionSummaryInterval)
    sessionTracker.on('summary', sendSessionSummary(client))
    sessionTracker.start()
    client._sessionDelegate = {
      startSession: (client, session) => {
        const sessionClient = clone(client)
        sessionClient._session = session
        sessionClient._pausedSession = null
        sessionTracker.track(sessionClient._session)
        return sessionClient
      },
      pauseSession: (client) => {
        client._pausedSession = client._session
        client._session = null
      },
      resumeSession: (client) => {
        if (client._pausedSession) {
          client._session = client._pausedSession
          client._pausedSession = null
          return client
        } else {
          return client.startSession()
        }
      }
    }
  },
  configSchema: {
    sessionSummaryInterval: {
      defaultValue: () => undefined,
      validate: value => value === undefined || intRange()(value),
      message: 'should be a positive integer'
    }
  }
}

const sendSessionSummary = client => sessionCounts => {
  const releaseStage = inferReleaseStage(client)

  // exit early if the current releaseStage is not enabled
  if (client._config.enabledReleaseStages.length > 0 && !includes(client._config.enabledReleaseStages, releaseStage)) {
    client._logger.warn('Session not sent due to releaseStage/enabledReleaseStages configuration')
    return
  }

  if (!sessionCounts.length) return

  const backoff = new Backoff({ min: 1000, max: 10000 })
  const maxAttempts = 10
  req(handleRes)

  function handleRes (err) {
    if (!err) {
      const sessionCount = sessionCounts.reduce((accum, s) => accum + s.sessionsStarted, 0)
      return client._logger.debug(`${sessionCount} session(s) reported`)
    }
    if (backoff.attempts === 10) {
      client._logger.error('Session delivery failed, max retries exceeded', err)
      return
    }
    client._logger.debug('Session delivery failed, retry #' + (backoff.attempts + 1) + '/' + maxAttempts, err)
    setTimeout(() => req(handleRes), backoff.duration())
  }

  function req (cb) {
    const payload = {
      notifier: client._notifier,
      device: {},
      app: { ...{ releaseStage }, ...client.app },
      sessionCounts
    }

    const ignore = runSyncCallbacks(client._cbs.sp.slice(0), payload, 'onSessionPayload', client._logger)
    if (ignore) {
      client._logger.debug('Session not sent due to onSessionPayload callback')
      return cb(null)
    }

    client._delivery.sendSession(payload, cb)
  }
}
