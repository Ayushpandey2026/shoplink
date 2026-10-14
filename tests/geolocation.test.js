import test from 'node:test'
import assert from 'node:assert/strict'
import {
  centerMapOnLocation,
  getCurrentDeviceLocation,
  isValidCoordinates,
  toGeoJsonCoordinates,
  toLeafletPosition,
} from '../src/utils/geolocation.js'

const stubGeolocation = ({ coords, error }) => ({
  getCurrentPosition(success, failure, options) {
    stubGeolocation.options = options
    if (error) failure(error)
    else success({ coords })
  },
})

test('device geolocation returns validated coordinates with high accuracy and no cached position', async () => {
  const geolocation = stubGeolocation({
    coords: { latitude: 25.308, longitude: 82.9384 },
  })
  const location = await getCurrentDeviceLocation({ geolocation, isSecureContext: true })

  assert.deepEqual(location, { latitude: 25.308, longitude: 82.9384 })
  assert.equal(stubGeolocation.options.enableHighAccuracy, true)
  assert.equal(stubGeolocation.options.maximumAge, 0)
  assert.equal(stubGeolocation.options.timeout, 15000)
  assert.deepEqual(toLeafletPosition(location), [25.308, 82.9384])
  assert.deepEqual(toGeoJsonCoordinates(location), [82.9384, 25.308])

  const map = { flyTo(...args) { this.lastFlyTo = args } }
  assert.equal(centerMapOnLocation(map, location), true)
  assert.deepEqual(map.lastFlyTo, [
    [25.308, 82.9384],
    15,
    { animate: true, duration: 0.8 },
  ])
  assert.equal(centerMapOnLocation(map, { latitude: 91, longitude: 0 }), false)
});

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
});

test('invalid device coordinates are rejected', async () => {
  await assert.rejects(
    getCurrentDeviceLocation({
      geolocation: stubGeolocation({ coords: { latitude: 91, longitude: 0 } }),
      isSecureContext: true,
    }),
    /invalid location coordinates/i
  );
  assert.equal(isValidCoordinates({ latitude: 0, longitude: 181 }), false)
});
