import test from 'node:test'
import assert from 'node:assert/strict'
import {
  centerMapOnLocation,
  getCurrentDeviceLocation,
  isValidCoordinates,
  createManualLocation,
  toGeoJsonCoordinates,
  toLeafletPosition,
} from '../src/utils/geolocation.js'

const stubGeolocation = ({ coords, error, timestamp = 1700000000000 }) => ({
  getCurrentPosition(success, failure, options) {
    stubGeolocation.options = options
    if (error) failure(error)
    else success({ coords, timestamp })
  },
})

test('fresh device geolocation returns validated coordinates and acquisition metadata', async () => {
  const geolocation = stubGeolocation({
    coords: { latitude: 25.308, longitude: 82.9384, accuracy: 34.6 },
  })
  const location = await getCurrentDeviceLocation({ geolocation, isSecureContext: true })

  assert.deepEqual(location, {
    latitude: 25.308,
    longitude: 82.9384,
    accuracy: 34.6,
    acquiredAt: new Date(1700000000000).toISOString(),
    source: 'gps',
  })
  assert.equal(stubGeolocation.options.enableHighAccuracy, true)
  assert.equal(stubGeolocation.options.maximumAge, 0)
  assert.equal(stubGeolocation.options.timeout, 20000)
  assert.deepEqual(toLeafletPosition(location), [25.308, 82.9384])
  assert.deepEqual(toGeoJsonCoordinates(location), [82.9384, 25.308])

  const map = { setView(...args) { this.lastSetView = args } }
  assert.equal(centerMapOnLocation(map, location), true)
  assert.deepEqual(map.lastSetView, [
    [25.308, 82.9384],
    15,
    { animate: false },
  ])
  assert.equal(centerMapOnLocation(map, { latitude: 91, longitude: 0 }), false)
})

test('permission denied, timeout, unavailable and insecure contexts have clear errors', async () => {
  const cases = [
    [{ code: 1 }, /permission was denied/i],
    [{ code: 2 }, /location is unavailable/i],
    [{ code: 3 }, /timed out/i],
  ]

  for (const [error, expected] of cases) {
    await assert.rejects(
      getCurrentDeviceLocation({
        geolocation: stubGeolocation({ error }),
        isSecureContext: true,
      }),
      expected
    )
  }

  await assert.rejects(
    getCurrentDeviceLocation({ geolocation: stubGeolocation({}), isSecureContext: false }),
    /secure HTTPS/i
  )
  await assert.rejects(
    getCurrentDeviceLocation({ geolocation: null, isSecureContext: true }),
    /not supported/i
  )
})

test('invalid and malformed device coordinates are rejected', async () => {
  await assert.rejects(
    getCurrentDeviceLocation({
      geolocation: stubGeolocation({ coords: { latitude: 91, longitude: 0 } }),
      isSecureContext: true,
    }),
    /invalid location coordinates/i
  )
  await assert.rejects(
    getCurrentDeviceLocation({
      geolocation: { getCurrentPosition(success) { success({ timestamp: 0 }) } },
      isSecureContext: true,
    }),
    /no location coordinates/i
  )
  assert.equal(isValidCoordinates({ latitude: 0, longitude: 181 }), false)
})

test('manual coordinates are validated and are not represented as a GPS fix', () => {
  const location = createManualLocation({
    latitude: '25.308',
    longitude: '82.9384',
    address: 'Example locality',
  })
  assert.equal(location.latitude, 25.308)
  assert.equal(location.longitude, 82.9384)
  assert.equal(location.accuracy, null)
  assert.equal(location.source, 'manual')
  assert.equal(location.address, 'Example locality')
  assert.throws(() => createManualLocation({ latitude: 91, longitude: 0 }), /valid location/i)
})
