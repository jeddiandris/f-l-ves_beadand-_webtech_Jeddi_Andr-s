// --- KONFIGURÁCIÓ ÉS ÁLLAPOT ---
// A feladat kéri a "transzparens paraméterkezelést".
// Ezzel a kóddal az URL-ből olvassuk ki a Neptun kódot.
const urlParams = new URLSearchParams(window.location.search);
const NEPTUN_CODE = urlParams.get('neptun') || 'EVJFBL'; 
const API_BASE_URL = `https://iit-playground.arondev.hu/api/${NEPTUN_CODE}/car`;

// --- DOM ELEMEK BEGYŰJTÉSE ---
// Eltároljuk változókba a HTML elemeket, hogy később könnyen módosíthassuk őket
const sectionList = document.getElementById('list-section');
const sectionForm = document.getElementById('form-section');
const carListContainer = document.getElementById('car-list');
const btnNewCar = document.getElementById('btn-new-car');
const btnCancel = document.getElementById('btn-cancel');
const carForm = document.getElementById('car-form');
const errorBox = document.getElementById('error-box');

// Űrlap mezők
const inputId = document.getElementById('car-id');
const inputBrand = document.getElementById('car-brand');
const inputModel = document.getElementById('car-model');
const inputOwner = document.getElementById('car-owner');
const inputDate = document.getElementById('car-date');
const inputElectric = document.getElementById('car-electric');
const inputFuel = document.getElementById('car-fuel');
const formTitle = document.getElementById('form-title');

// --- ESEMÉNYKEZELŐK (Event Listeners) ---
// Figyeljük, ha a felhasználó kattint vagy űrlapot küld be
btnNewCar.addEventListener('click', showCreateForm);
btnCancel.addEventListener('click', showList);
carForm.addEventListener('submit', handleFormSubmit);

// Amikor betöltődik az oldal, azonnal lekérjük az autókat
document.addEventListener('DOMContentLoaded', fetchCars);

// --- HIBAKEZELÉS (Jó szint követelménye) ---
function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
    // 5 másodperc múlva eltüntetjük a hibát
    setTimeout(() => {
        errorBox.classList.add('hidden');
    }, 5000);
}

// Biztonságos API hívó függvény (központi hibakezeléssel)
async function apiCall(url, method = 'GET', body = null) {
    const options = {
        method: method,
        headers: {
            'Accept': 'application/json'
        }
    };

    if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            // Jó szint: szerver és üzleti logika hibák feldolgozása
            let errorMessage = "Váratlan szerverhiba történt.";
            try {
                const errorData = await response.json();
                if (errorData.message) {
                    errorMessage = errorData.message; // pl. "Fuel consumption should be greater than 0."
                }
            } catch (e) {
                // Ha a szerver nem küldött értelmes JSON hibát
            }
            throw new Error(errorMessage); // Dobjuk a hibát, amit a catch blokk elkap
        }

        // A DELETE kérés sokszor nem ad vissza semmit
        if (response.status === 204 || method === 'DELETE') {
            return true; 
        }

        return await response.json();

    } catch (error) {
        showError(`Hiba: ${error.message}`);
        console.error("API Hiba:", error);
        return null; // Null-al jelezzük, hogy hiba volt
    }
}

// --- SZERVER MŰVELETEK ÉS LOGIKA ---

// 1. Olvasási művelet: Autók listázása (Elégséges szint)
async function fetchCars() {
    carListContainer.innerHTML = '<p>Betöltés...</p>';
    const cars = await apiCall(API_BASE_URL);
    
    if (cars) {
        renderCars(cars);
    } else {
        carListContainer.innerHTML = '<p>Nem sikerült betölteni az autókat.</p>';
    }
}

// Kirajzolja az autókat a DOM-ba
function renderCars(cars) {
    carListContainer.innerHTML = ''; // Kiürítjük a korábbi listát
    
    if (cars.length === 0) {
        carListContainer.innerHTML = '<p>Még nincsenek autók rögzítve.</p>';
        return;
    }

    cars.forEach(car => {
        // Document API használata (Alapkövetelmény)
        const card = document.createElement('div');
        card.className = 'car-card';
        
        card.innerHTML = `
            <h3>${car.brand} ${car.model}</h3>
            <p><strong>Tulajdonos:</strong> ${car.owner}</p>
            <p><strong>Forgalomba helyezés:</strong> ${car.dayOfCommission}</p>
            <p><strong>Típus:</strong> ${car.electric ? 'Elektromos' : 'Belsőégésű'}</p>
            <p><strong>Fogyasztás:</strong> ${car.fuelUse} l/100km</p>
            <hr>
            <button class="btn btn-primary" onclick="editCar(${car.id})">Szerkesztés (Részletek)</button>
            <button class="btn btn-danger" onclick="deleteCar(${car.id})">Törlés</button>
        `;
        carListContainer.appendChild(card);
    });
}

// 2. Olvasási művelet: Adott autó megjelenítése/Szerkesztés előkészítése (Elégséges szint)
async function editCar(id) {
    const car = await apiCall(`${API_BASE_URL}/${id}`);
    
    if (car) {
        // Űrlap feltöltése az adatokkal
        inputId.value = car.id;
        inputBrand.value = car.brand;
        inputModel.value = car.model;
        inputOwner.value = car.owner;
        inputDate.value = car.dayOfCommission;
        inputElectric.checked = car.electric;
        inputFuel.value = car.fuelUse;

        formTitle.textContent = "Autó adatainak módosítása";
        
        // Nézet váltása
        sectionList.classList.add('hidden');
        sectionForm.classList.remove('hidden');
    }
}

// 3. Írási művelet: Új autó vagy Módosítás (Közepes szint)
async function handleFormSubmit(event) {
    event.preventDefault(); // Megakadályozzuk az oldal újratöltését

    // Validáció (Jó szint - üzleti logika korlátozások saját kezű ellenőrzése, mielőtt elküldjük)
    const fuelValue = parseFloat(inputFuel.value);
    const isElectric = inputElectric.checked;
    
    if (!isElectric && fuelValue <= 0) {
        showError("Üzleti logika hiba: Hagyományos autónál a fogyasztásnak nagyobbnak kell lennie 0-nál!");
        return;
    }

    // Összegyűjtjük az adatokat egy objektumba
    const carData = {
        brand: inputBrand.value,
        model: inputModel.value,
        owner: inputOwner.value,
        dayOfCommission: inputDate.value,
        electric: isElectric,
        fuelUse: fuelValue
    };

    const currentId = inputId.value;

    if (currentId) {
        // Ha van ID, akkor MÓDOSÍTÁS (PUT)
        const result = await apiCall(`${API_BASE_URL}/${currentId}`, 'PUT', carData);
        if (result !== null) {
            showList(); // Vissza a listához
            fetchCars(); // Lista frissítése
        }
    } else {
        // Ha nincs ID, akkor LÉTREHOZÁS (POST)
        const result = await apiCall(API_BASE_URL, 'POST', carData);
        if (result !== null) {
            showList();
            fetchCars();
        }
    }
}

// 4. Írási művelet: Törlés (Közepes szint)
async function deleteCar(id) {
    if (confirm('Biztosan törölni szeretnéd ezt az autót?')) {
        const result = await apiCall(`${API_BASE_URL}/${id}`, 'DELETE');
        if (result !== null) {
            fetchCars(); // Frissítjük a listát a törlés után
        }
    }
}

// --- FELÜLETI NAVIGÁCIÓ ---
function showCreateForm() {
    carForm.reset(); // Kiürítjük az űrlapot
    inputId.value = ''; // Biztosítjuk, hogy ne legyen ID (tehát új autó lesz)
    formTitle.textContent = "Új autó hozzáadása";
    
    sectionList.classList.add('hidden');
    sectionForm.classList.remove('hidden');
}

function showList() {
    sectionForm.classList.add('hidden');
    sectionList.classList.remove('hidden');
}