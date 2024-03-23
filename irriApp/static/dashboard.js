const API_KEY = 'mEVxx5PMJlm9cfWml975I2Ff1oFRFZM7';
const BASE_URL = 'https://ny3.blynk.cloud/external/api';
let soilMoistureGauge;

function togglePump() {
    const button = document.getElementById('pump-toggle');
    const currentState = button.textContent.includes('OFF') ? 1 : 0;
    const newState = currentState === 0 ? 1 : 0;

    fetch(`${BASE_URL}/update?token=${API_KEY}&V2=${newState}`, { method: 'GET' })
        .then(response => {
            if (response.ok) {
                console.log('Pump state updated successfully');
                console.log(response, newState);
                button.textContent = newState === 1 ? 'Turn Pump OFF' : 'Turn Pump ON';
                if (newState === 1) {
                    const lastPumpOnTime = new Date().toLocaleString();
                    localStorage.setItem('lastPumpOnTime', lastPumpOnTime);
                    document.getElementById('pump-on-message').textContent = `Last time pump was turned on: ${lastPumpOnTime}`;
                }
            } else {
                console.error('Error updating pump state:', response.status);
            }
        })
        .catch(error => {
            console.error('Error toggling pump state:', error);
        });
}

function setPumpTimer() {
    const timerInput = document.getElementById('pump-timer');
    const time = timerInput.value;

    fetch(`${BASE_URL}/update?token=${API_KEY}&V1=${time}`, { method: 'GET' })
        .then(() => {
            const [hours, minutes] = time.split(':').map(Number);
            const now = new Date();
            const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
            let timeDiff = targetTime - now;

            if (timeDiff < 0) {
                timeDiff += 24 * 60 * 60 * 1000; // Add 24 hours in milliseconds if the time has already passed
            }

            const irrigationDetails = {
                timeSet: time,
                timeRemaining: timeDiff + Date.now()
            };
            localStorage.setItem('irrigationDetails', JSON.stringify(irrigationDetails));

            updateCountdownMessage();
        })
        .catch(error => {
            console.error('Error setting pump timer:', error);
            document.getElementById('message').textContent = 'Error setting pump timer';
            document.getElementById('message').style.color = "red";
        });
}

function updateCountdownMessage() {
    const irrigationDetails = JSON.parse(localStorage.getItem('irrigationDetails'));
    if (irrigationDetails) {
        const timeDiff = irrigationDetails.timeRemaining - Date.now();
        if (timeDiff > 0) {
            const remainingHours = Math.floor(timeDiff / (1000 * 60 * 60));
            const remainingMinutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            document.getElementById('message').textContent = `Time remaining: ${remainingHours} hours and ${remainingMinutes} minutes.`;
        } else {
            document.getElementById('message').textContent = `Last irrigation was set for ${irrigationDetails.timeSet}`;
        
        }
    }
}

function refreshSoilMoisture() {
    fetch(`${BASE_URL}/get?token=${API_KEY}&V3`, { method: 'GET' })
        .then(response => response.json())
        .then(data => {
            checkHardwareConnect().then(isConnected => {
                if (!isConnected) {
                    data = 0;
                    document.getElementById('device-connection-message').textContent = `Device is not connected`;
                }
                else{
                    document.getElementById('device-connection-message').textContent = `Device is connected`;
                    document.getElementById('device-connection-mesage').style.color = "#4CAF50";
                }
                soilMoistureGauge.refresh(data);
            });
        })
        .catch(error => console.error('Error fetching soil moisture:', error));
}

function checkHardwareConnect() {
    return fetch(`${BASE_URL}/isHardwareConnected?token=${API_KEY}`, { method: 'GET' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Assuming 'data' contains a boolean indicating the hardware connection status
            return data; // Adjust this according to the actual structure of your response
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
            return false; // Assume not connected in case of an error
        });
}

document.addEventListener('DOMContentLoaded', function() {
    soilMoistureGauge = new JustGage({
        id: "soil-moisture-gauge",
        value: 0,
        min: 0,
        max: 100,
        title: "Soil Moisture",
        label: "%"
    });

    const lastPumpOnTime = localStorage.getItem('lastPumpOnTime');
    if (lastPumpOnTime) {
        document.getElementById('pump-on-message').textContent = `Last time pump was turned on: ${lastPumpOnTime}`;
    }

    updateCountdownMessage();
    refreshSoilMoisture(); // Fetch soil moisture data initially
    setInterval(refreshSoilMoisture, 1000); // Set an interval to refresh the soil moisture gauge every second
});
