document.addEventListener("DOMContentLoaded", function () {
    const vectorSource = new ol.source.Vector();
    const vectorLayer = new ol.layer.Vector({ source: vectorSource });

    const map = new ol.Map({
        target: "map",
        layers: [
            new ol.layer.Tile({ source: new ol.source.OSM() }),
            vectorLayer,
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([107.6174, -6.9039]), // Bandung
            zoom: 12,
        }),
    });

    // Elemen popup dalam peta
    const popupContainer = document.createElement("div");
    popupContainer.id = "popup";
    popupContainer.className = "popup";
    popupContainer.style.display = "none"; // Sembunyikan awalnya
    document.body.appendChild(popupContainer);

    const overlay = new ol.Overlay({
        element: popupContainer,
        positioning: "bottom-center",
        offset: [0, -15], // Geser sedikit agar pas di atas marker
    });
    map.addOverlay(overlay);

    function showPopup(coords, address) {
        popupContainer.innerHTML = `
            <strong>📍 Info Lokasi</strong><br>
            <b>Latitude:</b> ${coords[1].toFixed(6)}<br>
            <b>Longitude:</b> ${coords[0].toFixed(6)}<br>
            <b>Alamat:</b> ${address}
        `;
        overlay.setPosition(ol.proj.fromLonLat(coords));
        popupContainer.style.display = "block";
    }

    function addMarker(coords, isUser = false) {
        const iconSrc = isUser 
            ? 'https://cdn-icons-png.flaticon.com/128/456/456212.png' // Ikon pengguna
            : 'https://cdn-icons-png.flaticon.com/128/684/684908.png'; // Ikon lokasi biasa

        const marker = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat(coords)),
        });

        marker.setStyle(
            new ol.style.Style({
                image: new ol.style.Icon({
                    anchor: [0.5, 1],
                    src: iconSrc,
                    scale: 0.1, // Ukuran ikon
                }),
            })
        );

        vectorSource.addFeature(marker);
        vectorLayer.changed();

        // Reverse Geocoding untuk mendapatkan alamat
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[1]}&lon=${coords[0]}`)
            .then(response => response.json())
            .then(data => {
                let address = "Alamat tidak ditemukan";
                if (data && data.address) {
                    const addressParts = [
                        data.address.road,      
                        data.address.suburb,    
                        data.address.village,   
                        data.address.town,      
                        data.address.city,      
                        data.address.state,     
                        data.address.postcode,  
                        data.address.country    
                    ].filter(Boolean);
                    address = addressParts.join(', ');
                }

                // Simpan alamat di properti marker
                marker.set("info", { coords, address });
            })
            .catch(error => console.error("Error fetching location data:", error));
    }

    // 🟢 Klik tombol untuk menampilkan lokasi pengguna
    document.getElementById("get-location").addEventListener("click", function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = [position.coords.longitude, position.coords.latitude];
                    addMarker(coords, true);
                    map.getView().setCenter(ol.proj.fromLonLat(coords));
                    map.getView().setZoom(14);
                },
                () => alert("Lokasi tidak dapat diakses")
            );
        } else {
            alert("Geolokasi tidak didukung di browser ini.");
        }
    });

    // 🔴 Event Klik Map untuk Tambah Marker
    document.getElementById("add-marker").addEventListener("click", function () {
        map.once("click", (event) => {
            const coords = ol.proj.toLonLat(event.coordinate);
            addMarker(coords);
            console.log("Marker ditambahkan di:", coords);
        });
        alert("Klik di peta untuk menambahkan lokasi penjemputan!");
    });

    // 🔵 Event Klik Marker untuk Tampilkan Info di Popup
    map.on("click", (event) => {
        const feature = map.forEachFeatureAtPixel(event.pixel, (feature) => feature);
        if (feature && feature.get("info")) {
            const { coords, address } = feature.get("info");
            showPopup(coords, address);
        } else {
            popupContainer.style.display = "none"; // Sembunyikan popup jika bukan marker
        }
    });

    // Sembunyikan popup jika klik di luar marker
    map.on("pointermove", function (event) {
        if (!map.hasFeatureAtPixel(event.pixel)) {
            popupContainer.style.display = "none";
        }
    });
});
