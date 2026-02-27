const URL = "/model/";
let model, webcam, maxPredictions;
let isWebcamOn = false;
let currentBestGuess = ""; // Store what the AI thinks it sees

// 1. Navigation
function showTab(tabName) {
    document.getElementById('scanner').style.display = 'none';
    document.getElementById('history').style.display = 'none';
    document.getElementById(tabName).style.display = 'block';
}

// 2. Load Model
async function init() {
    try {
        model = await tmImage.load(URL + "model.json", URL + "metadata.json");
        maxPredictions = model.getTotalClasses();
        console.log("Model Loaded!");
    } catch (e) {
        console.error("Error loading model", e);
    }
}

// 3. Start Webcam
async function startWebcam() {
    document.getElementById("uploaded-image").style.display = "none";
    document.getElementById("result-box").style.display = "none";
    document.getElementById("scan-btn").style.display = "inline-block"; // Show Button
    
    const flip = true; 
    webcam = new tmImage.Webcam(300, 300, flip); 
    await webcam.setup(); 
    await webcam.play();
    isWebcamOn = true;
    
    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(webcam.canvas);
    
    window.requestAnimationFrame(loop);
}

async function loop() {
    if (isWebcamOn) {
        webcam.update();
        await predict(webcam.canvas);
        window.requestAnimationFrame(loop);
    }
}

// 4. Handle Upload
async function handleUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    isWebcamOn = false;
    if (webcam) await webcam.stop();
    document.getElementById("webcam-container").innerHTML = "";
    document.getElementById("scan-btn").style.display = "none"; // Hide button for uploads

    const imgElement = document.getElementById("uploaded-image");
    imgElement.src = window.URL.createObjectURL(file);
    imgElement.style.display = "block";
    
    // For uploads, we DO want to auto-save because the user already picked the photo
    imgElement.onload = async function() { 
        await predict(imgElement, true); 
    }
}

// 5. Predict (The "Looking" Part)
async function predict(imageSource, isAutoSave = false) {
    if (!model) return;
    const prediction = await model.predict(imageSource);
    let bestMatch = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);

    // Save the guess, but don't send to server yet!
    currentBestGuess = bestMatch.className;

    // Raise threshold back to 50% to avoid "ghost" detections
    if (bestMatch.probability > 0.50) {
        document.getElementById("label").innerText = bestMatch.className + " (" + Math.round(bestMatch.probability * 100) + "%)";
        
        // Only save automatically if it's an Uploaded Photo
        if (isAutoSave) {
            fetchDetails(currentBestGuess);
        }
    } else {
        document.getElementById("label").innerText = "Scanning...";
        currentBestGuess = ""; // Clear guess if unsure
    }
}

// 6. NEW: The "Save" Trigger
function captureNow() {
    if (currentBestGuess && currentBestGuess !== "Scanning...") {
        fetchDetails(currentBestGuess); // NOW we save to history!
    } else {
        alert("Wait until the AI detects an item first!");
    }
}

// 7. Get Details & Save to History
async function fetchDetails(itemName) {
    // Add timestamp to force browser to talk to server
    const response = await fetch(`/api/waste?item=${itemName}&_=${new Date().getTime()}`);
    const data = await response.json();

    if(data.name === "Unknown") return;

    // Show Results
    document.getElementById("result-box").style.display = "block";
    document.getElementById("item-name").innerText = data.name;
    document.getElementById("recycling-steps").innerText = data.recyclingSteps;

    const dangerBox = document.getElementById("danger-box");
    const safeBox = document.getElementById("safe-box");

    if (data.isHazardous) {
        dangerBox.innerText = "⚠️ DANGER: " + data.dangerDetails;
        dangerBox.style.display = "block";
        safeBox.style.display = "none";
    } else {
        safeBox.innerText = "✅ SAFE: " + data.dangerDetails;
        safeBox.style.display = "block";
        dangerBox.style.display = "none";
    }

    const list = document.getElementById("component-list");
    list.innerHTML = "";
    data.components.forEach(c => {
        let li = document.createElement("li");
        li.innerText = c;
        list.appendChild(li);
    });
}

// 8. History Logic (Same as before)
async function loadHistory() {
    showTab('history');
    const response = await fetch('/api/history');
    const data = await response.json();
    const tableBody = document.getElementById("history-table-body");
    tableBody.innerHTML = "";
    let safeCount = 0; let hazardousCount = 0;

    data.forEach(record => {
        let row = `<tr><td>${record.timestamp}</td><td>${record.itemName}</td><td class="${record.category === 'Hazardous' ? 'text-danger' : 'text-success'}">${record.category}</td></tr>`;
        tableBody.innerHTML += row;
        if (record.category === 'Hazardous') hazardousCount++; else safeCount++;
    });
    drawChart(safeCount, hazardousCount);
}

let myChart = null;
function drawChart(safe, hazardous) {
    const ctx = document.getElementById('myChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Safe', 'Hazardous'],
            datasets: [{ data: [safe, hazardous], backgroundColor: ['#28a745', '#dc3545'] }]
        }
    });
}

init();