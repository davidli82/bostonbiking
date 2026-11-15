import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

mapboxgl.accessToken = window.MAPBOX_ACCESS_TOKEN || '';

const status = document.getElementById('status');
const departuresByMinute = Array.from({ length: 1440 }, () => []);
const arrivalsByMinute = Array.from({ length: 1440 }, () => []);
const stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);
const svg = d3.select('#map svg');

let map;
if (!mapboxgl.accessToken) {
  status.textContent = 'Add your Mapbox public access token in config.js to load the map.';
} else {
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-71.09415, 42.36027],
    zoom: 12,
    minZoom: 5,
    maxZoom: 18,
  });

  map.on('error', (event) => {
    console.error('Map error:', event.error);
    status.textContent = 'A map resource could not load. Check the console for details.';
  });
  map.on('load', loadData);
}

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function formatTime(minutes) {
  const date = new Date(2024, 2, 1, 0, minutes);
  return date.toLocaleTimeString('en-US', { timeStyle: 'short' });
}

function filterByMinute(tripsByMinute, minute) {
  if (minute === -1) return tripsByMinute.flat();

  const minMinute = (minute - 60 + 1440) % 1440;
  const maxMinute = (minute + 60) % 1440;
  // Include both ends of the window, even when it crosses midnight.
  if (minMinute > maxMinute) {
    return tripsByMinute.slice(minMinute)
      .concat(tripsByMinute.slice(0, maxMinute + 1)).flat();
  }
  return tripsByMinute.slice(minMinute, maxMinute + 1).flat();
}

function computeStationTraffic(stations, timeFilter = -1) {
  const departures = d3.rollup(
    filterByMinute(departuresByMinute, timeFilter),
    (v) => v.length,
    (d) => d.start_station_id,
  );
  const arrivals = d3.rollup(
    filterByMinute(arrivalsByMinute, timeFilter),
    (v) => v.length,
    (d) => d.end_station_id,
  );

  return stations.map((station) => {
    const id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}

async function loadData() {
  const bikeLaneStyle = {
    'line-color': 'green',
    'line-width': 3,
    'line-opacity': 0.4,
  };

  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });
  map.addLayer({
    id: 'boston-bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: bikeLaneStyle,
  });

  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
  });
  map.addLayer({
    id: 'cambridge-bike-lanes',
    type: 'line',
    source: 'cambridge_route',
    paint: bikeLaneStyle,
  });

  status.textContent = 'Loading stations and March 2024 trips…';
  try {
    const jsonData = await d3.json('https://dsc106.com/labs/lab07/data/bluebikes-stations.json');
    await d3.csv('https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv', (trip) => {
      trip.started_at = new Date(trip.started_at.replace(' ', 'T'));
      trip.ended_at = new Date(trip.ended_at.replace(' ', 'T'));
      departuresByMinute[minutesSinceMidnight(trip.started_at)].push(trip);
      arrivalsByMinute[minutesSinceMidnight(trip.ended_at)].push(trip);
      return trip;
    });

    const stations = computeStationTraffic(jsonData.data.stations);
    const radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(stations, (d) => d.totalTraffic)])
      .range([0, 25]);

    const circles = svg.selectAll('circle')
      .data(stations, (d) => d.short_name)
      .enter()
      .append('circle')
      .attr('r', (d) => radiusScale(d.totalTraffic))
      .style('--departure-ratio', (d) => stationFlow(d.totalTraffic ? d.departures / d.totalTraffic : 0.5));
    circles.append('title');

    function updatePositions() {
      circles
        .attr('cx', (d) => getCoords(d).cx)
        .attr('cy', (d) => getCoords(d).cy);
    }
    updatePositions();
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);

    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('selected-time');
    const anyTimeLabel = document.getElementById('any-time');

    function updateScatterPlot(timeFilter) {
      const filteredStations = computeStationTraffic(stations, timeFilter);
      radiusScale.range(timeFilter === -1 ? [0, 25] : [3, 50]);
      circles.data(filteredStations, (d) => d.short_name)
        .attr('r', (d) => d.totalTraffic === 0 ? 0 : radiusScale(d.totalTraffic))
        .style('--departure-ratio', (d) => stationFlow(d.totalTraffic ? d.departures / d.totalTraffic : 0.5))
        .select('title')
        .text((d) => `${d.name}: ${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
    }

    function updateTimeDisplay() {
      const timeFilter = Number(timeSlider.value);
      selectedTime.textContent = timeFilter === -1 ? '' : formatTime(timeFilter);
      if (timeFilter === -1) {
        selectedTime.removeAttribute('datetime');
      } else {
        const hours = String(Math.floor((timeFilter % 1440) / 60)).padStart(2, '0');
        const minutes = String(timeFilter % 60).padStart(2, '0');
        selectedTime.dateTime = `${hours}:${minutes}`;
      }
      selectedTime.style.display = timeFilter === -1 ? 'none' : 'block';
      anyTimeLabel.style.display = timeFilter === -1 ? 'block' : 'none';
      updateScatterPlot(timeFilter);
    }

    timeSlider.disabled = false;
    timeSlider.addEventListener('input', updateTimeDisplay);
    updateTimeDisplay();
    status.textContent = '';
  } catch (error) {
    console.error('Error loading bike data:', error);
    status.textContent = 'Bike data could not load. Please refresh the page to try again.';
  }
}
