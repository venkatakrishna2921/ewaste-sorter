const URL = "./model/"; // Looks inside your static/model folder
let model, webcam, maxPredictions;
let isWebcamOn = false;
let currentBestGuess = ""; // Store what the AI thinks it sees
let lastPredictTime = 0; // NEW: Timer variable for the speed limit

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

// 3. Start Webcam & Speed Limit Loop
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

// NEW: Fixed loop to stop the website from lagging
async function loop() {
    if (isWebcamOn) {
        webcam.update(); // Keep the video smooth

        // SPEED LIMIT: Only run the heavy AI math every 200 milliseconds
        const currentTime = Date.now();
        if (currentTime - lastPredictTime > 200) {
            await predict(webcam.canvas);
            lastPredictTime = currentTime; 
        }

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

// 8. Fetch Details for UI
async function fetchDetails(itemName) {
    try {
        // Fetch directly from your updated Spring Boot server
        const response = await fetch(`/api/waste?item=${itemName}&_=${new Date().getTime()}`);
        const data = await response.json();

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

// 9. Securely Save to MySQL Database
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

// 10. NEW: Gamified History Logic & Impact Charts
async function loadHistory() {
    showTab('history');
    
    // 1. Fetch Fresh Data from MySQL
    const response = await fetch('/api/history?_=' + Date.now());
    allHistoryData = await response.json();
    
    // 2. Initialize Counters for Eco-Impact
    let gold = 0; let co2 = 0; let plastic = 0;

    // 3. Calculate Impact based on scanned items
    allHistoryData.forEach(r => {
        let name = (r.item_name || r.itemName || "").toLowerCase(); 
        if (name.includes("mobile") || name.includes("phone")) {
            gold += 0.034;
            co2 += 15;
        } else if (name.includes("mouse")) {
            plastic += 0.12;
            co2 += 2;
        } else if (name.includes("keyboard")) {
            plastic += 0.6;
            co2 += 5;
        } else if (name.includes("monitor") || name.includes("screen") || name.includes("display")) {
            plastic += 2.5; 
            co2 += 35;
            gold += 0.01; 
        } else if (name.includes("printer") || name.includes("inkjet") || name.includes("laser")) {
            plastic += 3.2; 
            co2 += 25;
        }
    });

    // 4. Update UI Impact Cards & Animate Gamified Progress Bars
    if (document.getElementById("impact-gold")) {
        document.getElementById("impact-gold").innerText = gold.toFixed(3) + " g";
        document.getElementById("impact-co2").innerText = co2.toFixed(1) + " kg";
        document.getElementById("impact-plastic").innerText = plastic.toFixed(1) + " kg";

        // Calculate percentages based on the set goals
        let goldPct = Math.min((gold / 1.0) * 100, 100);       // Goal: 1g
        let co2Pct = Math.min((co2 / 100.0) * 100, 100);       // Goal: 100kg
        let plasticPct = Math.min((plastic / 20.0) * 100, 100); // Goal: 20kg

        // Move the bars
        document.getElementById("bar-gold").style.width = goldPct + "%";
        document.getElementById("bar-co2").style.width = co2Pct + "%";
        document.getElementById("bar-plastic").style.width = plasticPct + "%";
    }

    // 5. Draw the pie chart and tables
    drawOverallChart();
    filterReports(); 
}

function drawOverallChart() {
    let deviceCounts = {};
    allHistoryData.forEach(r => { 
        let itemName = r.item_name || r.itemName; // Handle varying backend names
        deviceCounts[itemName] = (deviceCounts[itemName] || 0) + 1; 
    });
    
    const labels = Object.keys(deviceCounts);
    const values = Object.values(deviceCounts);
    const total = allHistoryData.length || 1;
    
    const labelsWithPct = labels.map((label, index) => {
        let pct = ((values[index] / total) * 100).toFixed(1);
        return `${label} (${pct}%)`;
    });
    
    const ctx = document.getElementById('myChart');
    if (myChart) myChart.destroy();
    
    // Draw the chart ONLY if there is data
    if (labels.length > 0) {
        myChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labelsWithPct,
                datasets: [{ data: values, backgroundColor: ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8'] }]
            }
        });
    }
}

// Helper functions for the tables
function filterReports() {
    // Add logic here if you want to filter your tables by date
}

// Initialize on page load
init();