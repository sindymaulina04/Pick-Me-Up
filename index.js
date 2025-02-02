import Map from 'https://cdn.skypack.dev/ol/Map.js';
import OSM from 'https://cdn.skypack.dev/ol/source/OSM.js';
import TileLayer from 'https://cdn.skypack.dev/ol/layer/Tile.js';
import View from 'https://cdn.skypack.dev/ol/View.js';
import { fromLonLat, toLonLat } from 'https://cdn.skypack.dev/ol/proj.js';
import Feature from 'https://cdn.skypack.dev/ol/Feature.js';
import Point from 'https://cdn.skypack.dev/ol/geom/Point.js';
import VectorSource from 'https://cdn.skypack.dev/ol/source/Vector.js';
import VectorLayer from 'https://cdn.skypack.dev/ol/layer/Vector.js';
import Style from 'https://cdn.skypack.dev/ol/style/Style.js';
import Icon from 'https://cdn.skypack.dev/ol/style/Icon.js';
import { getDistance } from 'https://cdn.skypack.dev/ol/sphere.js';
import LineString from 'https://cdn.skypack.dev/ol/geom/LineString.js';

const map = new Map({
    target: 'map',
    layers: [new TileLayer({ source: new OSM() })],
    view: new View({ center: fromLonLat([106.8456, -6.2088]), zoom: 12 })
});

const vectorSource = new VectorSource();
const vectorLayer = new VectorLayer({ source: vectorSource });
map.addLayer(vectorLayer);

let userMarker = null;
let manualMarker = null;
let routeLine = null;

// Ambil lokasi pengguna
document.getElementById('get-location').addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async position => {
            const { latitude, longitude } = position.coords;
            const coordinate = fromLonLat([longitude, latitude]);
            map.getView().setCenter(coordinate);
            map.getView().setZoom(17);

            if (userMarker) {
                vectorSource.removeFeature(userMarker);
            }

            userMarker = addMarker(coordinate, 'user');

            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                const address = data.address;
                const detailedAddress = formatAddress(address);
                document.getElementById('info').innerHTML = ` Lokasi Anda:<br><strong>${detailedAddress}</strong>`;
            } catch (error) {
                console.error("Error fetching address:", error);
                document.getElementById('info').innerHTML = "Gagal mendapatkan alamat.";
            }
        }, () => {
            alert('Gagal mendapatkan lokasi');
        });
    } else {
        alert('Geolocation tidak didukung di browser ini');
    }
});

// Tambah marker manual
document.getElementById('add-marker').addEventListener('click', () => {
    map.once('click', async event => {
        const coordinate = event.coordinate;

        if (manualMarker) {
            vectorSource.removeFeature(manualMarker);
        }

        manualMarker = addMarker(coordinate, 'manual');
        const manualCoordinate = toLonLat(coordinate);
        const [lon, lat] = manualCoordinate;

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const address = data.address;
            const detailedAddress = formatAddress(address);
            document.getElementById('manual-info').innerHTML = ` Lokasi Marker Manual:<br><strong>${detailedAddress}</strong>`;
        } catch (error) {
            console.error("Error fetching address:", error);
            document.getElementById('manual-info').innerHTML = "Gagal mendapatkan alamat.";
        }

        calculateDistance();
    });
});

// Fungsi memformat alamat
function formatAddress(address) {
    return `${address.road || ''}, ${address.suburb || ''}, ${address.village || ''}, 
            ${address.town || ''}, ${address.city || ''}, ${address.state || ''}, 
            ${address.country || ''} (${address.postcode || ''})`;
}

// Fungsi menambah marker
function addMarker(coordinate, type) {
    const marker = new Feature({ geometry: new Point(coordinate) });
    marker.setStyle(new Style({
        image: new Icon({
            src: type === 'user'
                ? 'https://cdn-icons-png.flaticon.com/32/684/684908.png'
                : 'https://cdn-icons-png.flaticon.com/32/684/684909.png',
            scale: 1.0
        })
    }));
    vectorSource.addFeature(marker);
    return marker;
}

// Fungsi untuk mengambil dan menampilkan rute
async function getRoute(start, end) {
    const startCoords = toLonLat(start);
    const endCoords = toLonLat(end);

    try {
        const response = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=YOUR_OPENROUTESERVICE_API_KEY&start=${startCoords.join(',')}&end=${endCoords.join(',')}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const routeCoordinates = data.features[0].geometry.coordinates.map(coord => fromLonLat(coord));

        if (routeLine) {
            vectorSource.removeFeature(routeLine);
        }

        routeLine = new Feature({ geometry: new LineString(routeCoordinates) });
        routeLine.setStyle(new Style({
            stroke: new Style.Stroke({
                color: 'blue',
                width: 3
            })
        }));

        vectorSource.addFeature(routeLine);
    } catch (error) {
        console.error("Error fetching route:", error);
        // alert("Gagal menghitung rute.");
    }
}

// Menghitung jarak antara marker dan menampilkan rute
function calculateDistance() {
    if (userMarker && manualMarker) {
        const userCoordinate = userMarker.getGeometry().getCoordinates();
        const manualCoordinate = manualMarker.getGeometry().getCoordinates();

        const userLatLng = toLonLat(userCoordinate);
        const manualLatLng = toLonLat(manualCoordinate);
        const distance = getDistance(userLatLng, manualLatLng);
        const distanceKm = (distance / 1000).toFixed(2);
        document.getElementById('distance-info').innerHTML = `Jarak antara lokasi Anda dan marker manual: ${distanceKm} km`;

        getRoute(userCoordinate, manualCoordinate);
    }
}

// Ambil elemen tombol panah
const upButton = document.getElementById('panah-ke-atas');
const rightButton = document.getElementById('panah-ke-kanan');
const leftButton = document.getElementById('panah-ke-kiri');

// Tambahkan event listener ke tombol panah
upButton.addEventListener('click', () => {
    panMap(0, -100); // Sesuaikan nilai untuk pergerakan yang diinginkan
});

rightButton.addEventListener('click', () => {
    panMap(100, 0); // Sesuaikan nilai untuk pergerakan yang diinginkan
});

leftButton.addEventListener('click', () => {
    panMap(-100, 0); // Sesuaikan nilai untuk pergerakan yang diinginkan
});

// Fungsi untuk menggeser peta
function panMap(xOffset, yOffset) {
    const view = map.getView();
    const center = view.getCenter();
    const newCenter = [center[0] + xOffset, center[1] + yOffset];

    view.animate({
        center: newCenter,
        duration: 250 // Durasi animasi dalam milidetik
    });
}


