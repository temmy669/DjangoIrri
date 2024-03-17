const API_KEY = 'mEVxx5PMJlm9cfWml975I2Ff1oFRFZM7';
const BASE_URL = 'https://ny3.blynk.cloud/external/api';
let soilMoistureGauge;

function togglePump() {
    const button = document.getElementById('pump-toggle');
    const currentState = button.textContent.includes('ON') ? 1 : 0;
    const newState = currentState === 1 ? 0 : 1;

    fetch(`${BASE_URL}/update?token=${API_KEY}&V2=${newState}`, { method: 'GET' })
        .then(() => {
            button.textContent = newState === 1 ? 'Turn Pump OFF' : 'Turn Pump ON';
            if (newState === 1) {
                // Store the time when the pump is turned on in local storage
                const lastPumpOnTime = new Date().toLocaleString();
                localStorage.setItem('lastPumpOnTime', lastPumpOnTime);
                document.getElementById('pump-on-message').textContent = `Last time pump was turned on: ${lastPumpOnTime}`;
            }
        })
        .catch(error => console.error('Error toggling pump state:', error));
}

function updateCountdownMessage(timeDiff) {
    const messageElement = document.getElementById('message');
    const remainingHours = Math.floor(timeDiff / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    messageElement.textContent = `Time remaining: ${remainingHours} hours and ${remainingMinutes} minutes.`;
}

function setPumpTimer() {
    const timerInput = document.getElementById('pump-timer');
    const time = timerInput.value;
    const messageElement = document.getElementById('message'); // Get the message element

    fetch(`${BASE_URL}/update?token=${API_KEY}&V1=${time}`, { method: 'GET' })
        .then(() => {
            const [hours, minutes] = time.split(':').map(Number);
            const now = new Date();
            const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
            let timeDiff = targetTime - now;

            if (timeDiff < 0) {
                timeDiff += 24 * 60 * 60 * 1000; // Add 24 hours in milliseconds if the time has already passed
            }

            // Store the irrigation details in local storage
            const irrigationDetails = {
                timeSet: time,
                timeRemaining: timeDiff + Date.now()
            };
            localStorage.setItem('irrigationDetails', JSON.stringify(irrigationDetails));

            updateCountdownMessage(timeDiff);
        })
        .catch(error => {
            console.error('Error setting pump timer:', error);
            messageElement.textContent = 'Error setting pump timer'; // Display error message on the web page
        });
}

// Initialize the soil moisture gauge and display the last irrigation information on login
document.addEventListener('DOMContentLoaded', function() {
    soilMoistureGauge = new JustGage({
        id: "soil-moisture-gauge",
        value: 0,
        min: 0,
        max: 100,
        title: "Soil Moisture",
        label: "%"
    });

    const irrigationDetails = JSON.parse(localStorage.getItem('irrigationDetails'));
    if (irrigationDetails) {
        const timeDiff = irrigationDetails.timeRemaining - Date.now();
        if (timeDiff > 0) {
            updateCountdownMessage(timeDiff);
        } else {
            document.getElementById('message').textContent = `Last irrigation was set for ${irrigationDetails.timeSet}`;
        }
    }

    const lastPumpOnTime = localStorage.getItem('lastPumpOnTime');
    if (lastPumpOnTime) {
        document.getElementById('pump-on-message').textContent = `Last time pump was turned on: ${lastPumpOnTime}`;
    }

    // Fetch soil moisture percentage and update gauge
    fetch(`${BASE_URL}/get?token=${API_KEY}&V3`, { method: 'GET' })
        .then(response => response.json())
        .then(data => {
            soilMoistureGauge.refresh(data);
        })
        .catch(error => console.error('Error fetching soil moisture:', error));
});
