const URL = "./model/"; // Looks inside your static/model folder
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
        console.log("✅ Model Loaded!");
    } catch (e) {
        console.error("❌ Error loading model. Check folder path.", e);
    }
}

// 3. Start Webcam
async function startWebcam() {
    document.getElementById("uploaded-image").style.display = "none";
    document.getElementById("result-box").style.display = "none";
    document.getElementById("scan-btn").style.display = "inline-block"; // Show Capture Button
    
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
    
    // Auto-process the uploaded photo
    imgElement.onload = async function() { 
        await predict(imgElement, true); 
    }
}

// 5. Predict (The "Looking" Part)
async function predict(imageSource, isAutoSave = false) {
    if (!model) return;
    const prediction = await model.predict(imageSource);
    
    // Find the class with the highest probability
    let bestMatch = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);

    // CHANGED: Increased threshold to 85% to prevent the AI from making wild guesses on empty walls
    if (bestMatch.probability > 0.85) {
        currentBestGuess = bestMatch.className;
        document.getElementById("label").innerText = currentBestGuess + " (" + Math.round(bestMatch.probability * 100) + "%)";
        
        // Only save automatically if it's an Uploaded Photo
        if (isAutoSave) {
            processItem(currentBestGuess); 
        }
    } else {
        document.getElementById("label").innerText = "Scanning...";
        currentBestGuess = ""; // Clear guess if unsure
    }
}

// 6. The "Capture" Trigger (Runs when you click the button)
function captureNow() {
    if (currentBestGuess && currentBestGuess !== "Scanning...") {
        processItem(currentBestGuess); 
    } else {
        alert("Hold the item steady until the AI recognizes it!");
    }
}

// 7. Master Function: Updates UI AND Saves to Database
async function processItem(itemName) {
    // A. Fetch details to display on the screen
    fetchDetails(itemName);
    
    // B. Save the scan to the MySQL Database permanently
    saveToDatabase(itemName);
}

// 8. Fetch Details for UI (UPDATED WITH LOCAL DATA)
async function fetchDetails(itemName) {
    // --- LOCAL DATABASE FOR NEW ITEMS ---
    const localEwasteDatabase = {
        "Monitor": {
            name: "Monitor (LCD/LED/CRT)",
            isHazardous: true,
            dangerDetails: "Contains Mercury, Lead, and Arsenic.",
            recyclingSteps: "Do NOT dismantle. Breaking the screen releases toxic vapor. Secure the power cable and take it directly to a certified e-waste drop-off center.",
            components: ["Hard Plastic (ABS)", "Glass / Liquid Crystals", "Mercury/LED Backlighting", "Circuit Boards (Lead Solder)"]
        },
        "Printer": {
            name: "Printer (Inkjet/Laser)",
            isHazardous: true,
            dangerDetails: "Contains Toner VOCs and chemical ink.",
            recyclingSteps: "Remove all ink or toner cartridges and seal them in a plastic bag. Do not throw cartridges in the trash. Recycle the empty hardware shell at a designated drop-off center.",
            components: ["Outer Casing (Fire-retardant plastic)", "Steel Shafts & Copper Motors", "Circuit Boards", "Toner/Ink Cartridges"]
        }
    };

    try {
        let data;

        // --- CHECK LOCAL DATA FIRST ---
        if (localEwasteDatabase[itemName]) {
            data = localEwasteDatabase[itemName]; // Use local data for Printers & Monitors
        } else {
            // Fetch from your Spring Boot server if it's an older item
            const response = await fetch(`/api/waste?item=${itemName}&_=${new Date().getTime()}`);
            data = await response.json();
        }

        if(!data || data.name === "Unknown") return;

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
    } catch (e) {
        console.error("Error fetching item details:", e);
    }
}

// 9. NEW: Securely Save to MySQL Database
async function saveToDatabase(itemName) {
    let hazardCategory = "Safe"; 

    // Categorize the new items accurately
    if (itemName === "Mobile Phone" || itemName === "Laptop" || itemName === "Monitor" || itemName === "Printer") {
        hazardCategory = "Hazardous";
    } else if (itemName === "Keyboard" || itemName === "Computer Mouse" || itemName === "Speaker") {
        hazardCategory = "Safe";
    }

    const scanData = {
        category: hazardCategory,
        item_name: itemName
    };

    try {
        const response = await fetch("/api/scans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scanData)
        });

        if (response.ok) {
            console.log(`✅ ${itemName} saved to MySQL Database!`);
        }
    } catch (error) {
        console.error("❌ Database save failed:", error);
    }
}

// 10. History Logic & Charts
async function loadHistory() {
    showTab('history');
    const response = await fetch('/api/history');
    const data = await response.json();
    const tableBody = document.getElementById("history-table-body");
    tableBody.innerHTML = "";
    let safeCount = 0; let hazardousCount = 0;

    data.forEach(record => {
        // Assuming your backend returns 'item_name' and 'timestamp'
        let row = `<tr><td>${record.timestamp}</td><td>${record.item_name}</td><td class="${record.category === 'Hazardous' ? 'text-danger' : 'text-success'}">${record.category}</td></tr>`;
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

// Initialize on page load
init();