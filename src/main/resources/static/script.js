const URL = "./model/"; 
let model, webcam;
let isWebcamOn = false;
let currentPrediction = "";
let myChart = null;
let allHistoryData = []; 
let lastPredictTime = 0; // The CPU Lag Fixer

async function init() {
    try { model = await tmImage.load(URL + "model.json", URL + "metadata.json"); } 
    catch (e) { console.error("Error loading model", e); }
}

function switchTab(tab) {
    document.getElementById("scanner-view").classList.toggle("hidden", tab !== 'scanner');
    document.getElementById("history-view").classList.toggle("hidden", tab !== 'history');
    
    document.getElementById("tab-scanner").classList.toggle('active', tab === 'scanner');
    document.getElementById("tab-history").classList.toggle('active', tab === 'history');
}

// --- SCANNER LOGIC ---
async function startWebcam() {
    document.getElementById("uploaded-image").style.display = "none";
    document.getElementById("result-box").classList.add("hidden");
    document.getElementById("capture-btn").classList.remove("hidden");
    const flip = true; 
    webcam = new tmImage.Webcam(300, 300, flip); 
    await webcam.setup(); 
    await webcam.play();
    isWebcamOn = true;
    
    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(webcam.canvas);
    container.classList.add("scanning"); 
    
    window.requestAnimationFrame(loop);
}

async function loop() {
    if (isWebcamOn) {
        webcam.update();
        const currentTime = Date.now();
        if (currentTime - lastPredictTime > 200) {
            await predict(webcam.canvas);
            lastPredictTime = currentTime; 
        }
        window.requestAnimationFrame(loop);
    }
}

async function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    isWebcamOn = false; if(webcam) await webcam.stop();
    
    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.classList.remove("scanning"); 
    
    const img = document.getElementById("uploaded-image");
    img.src = window.URL.createObjectURL(file);
    img.style.display = "block";
    document.getElementById("capture-btn").classList.remove("hidden");
    
    img.onload = async function() { 
        await predict(img); 
    }
}

async function predict(imageSource) {
    if (!model) return;
    const prediction = await model.predict(imageSource);
    let bestMatch = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);
    
    if (bestMatch.probability > 0.85) {
        document.getElementById("label").innerText = bestMatch.className;
        currentPrediction = bestMatch.className;
    } else {
        document.getElementById("label").innerText = "Scanning...";
        currentPrediction = "";
    }
}

async function saveToHistory() {
    if (!currentPrediction) {
        alert("Hold steady until the AI recognizes the item!");
        return;
    }
    // Fetches data AND saves to your MySQL Database instantly
    const response = await fetch(`/api/waste?item=${currentPrediction}&_=${Date.now()}`);
    const data = await response.json();
    
    document.getElementById("result-box").classList.remove("hidden");
    document.getElementById("item-name").innerText = data.name;
    document.getElementById("instructions").innerText = data.recyclingSteps;
    
    const alertBox = document.getElementById("alert-box");
    alertBox.className = data.isHazardous ? "alert alert-danger fw-bold" : "alert alert-success fw-bold";
    alertBox.innerText = data.isHazardous ? "⚠️ HAZARDOUS: " + data.dangerDetails : "✅ SAFE: " + data.dangerDetails;
    
    const list = document.getElementById("comp-list");
    list.innerHTML = "";
    data.components.forEach(c => {
        let li = document.createElement("li"); li.innerText = c; list.appendChild(li);
    });
}

// --- GAMIFIED HISTORY LOGIC ---
async function loadHistory() {
    switchTab('history');
    
    const response = await fetch('/api/history?_=' + Date.now());
    allHistoryData = await response.json();
    
    let gold = 0; let co2 = 0; let plastic = 0;

    allHistoryData.forEach(r => {
        let name = (r.itemName || r.item_name || "").toLowerCase(); 
        if (name.includes("mobile") || name.includes("phone")) {
            gold += 0.034; co2 += 15;
        } else if (name.includes("mouse")) {
            plastic += 0.12; co2 += 2;
        } else if (name.includes("keyboard")) {
            plastic += 0.6; co2 += 5;
        } else if (name.includes("monitor") || name.includes("screen") || name.includes("display")) {
            plastic += 2.5; co2 += 35; gold += 0.01; 
        } else if (name.includes("printer") || name.includes("inkjet") || name.includes("laser")) {
            plastic += 3.2; co2 += 25;
        }
    });

    if (document.getElementById("impact-gold")) {
        document.getElementById("impact-gold").innerText = gold.toFixed(3) + " g";
        document.getElementById("impact-co2").innerText = co2.toFixed(1) + " kg";
        document.getElementById("impact-plastic").innerText = plastic.toFixed(1) + " kg";

        let goldPct = Math.min((gold / 1.0) * 100, 100);       
        let co2Pct = Math.min((co2 / 100.0) * 100, 100);       
        let plasticPct = Math.min((plastic / 20.0) * 100, 100); 

        document.getElementById("bar-gold").style.width = goldPct + "%";
        document.getElementById("bar-co2").style.width = co2Pct + "%";
        document.getElementById("bar-plastic").style.width = plasticPct + "%";

        // --- LEVEL CALCULATION LOGIC ---
        const totalScans = allHistoryData.length;
        let level = 1;
        let title = "Earth Novice 🌱";
        let nextGoal = 5;

        if (totalScans >= 50) { level = 5; title = "Global Savior 🌍"; nextGoal = "Max"; }
        else if (totalScans >= 25) { level = 4; title = "Recycling Master 🏆"; nextGoal = 50; }
        else if (totalScans >= 10) { level = 3; title = "Eco Warrior ⚔️"; nextGoal = 25; }
        else if (totalScans >= 5) { level = 2; title = "Sustainability Hero 🦸"; nextGoal = 10; }

        if (document.getElementById("user-level-badge")) {
            document.getElementById("user-level-badge").innerHTML = `🌟 Level ${level}: ${title}`;
        }
        
        if (document.getElementById("level-subtitle")) {
            if (nextGoal !== "Max") {
                let scansLeft = nextGoal - totalScans;
                document.getElementById("level-subtitle").innerText = `Scan ${scansLeft} more item${scansLeft > 1 ? 's' : ''} to reach Level ${level + 1}!`;
            } else {
                document.getElementById("level-subtitle").innerText = `🎉 You have reached the maximum level!`;
            }
        }
    }

    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById("report-date") && !document.getElementById("report-date").value) {
        document.getElementById("report-date").value = today;
    }
    
    drawOverallChart();
    filterReports(); 
}

function drawOverallChart() {
    let deviceCounts = {};
    allHistoryData.forEach(r => { 
        let name = r.itemName || r.item_name;
        deviceCounts[name] = (deviceCounts[name] || 0) + 1; 
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
    myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labelsWithPct,
            datasets: [{ data: values, backgroundColor: ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8'] }]
        }
    });
}

// RESTORED: Table Filtering Logic
function filterReports() {
    const reportDateElement = document.getElementById("report-date");
    if (!reportDateElement) return;
    
    const selectedDate = reportDateElement.value;
    if (!selectedDate) return;
    
    const selectedMonth = selectedDate.substring(0, 7);
    const selectedYear = selectedDate.substring(0, 4);
    
    const dailyData = allHistoryData.filter(r => (r.timestamp || "").startsWith(selectedDate));
    const dailyTable = document.getElementById("daily-table");
    if (dailyTable) dailyTable.innerHTML = "";
    
    const noDataMsg = document.getElementById("no-daily-data");
    if (dailyData.length === 0) { 
        if (noDataMsg) noDataMsg.classList.remove("hidden"); 
    } else {
        if (noDataMsg) noDataMsg.classList.add("hidden");
        dailyData.forEach(r => { 
            let name = r.itemName || r.item_name;
            if (dailyTable) dailyTable.innerHTML += `<tr><td>${(r.timestamp || "").split(" ")[1] || ""}</td><td>${name}</td><td>${r.category}</td></tr>`; 
        });
    }
    
    const dailyLabel = document.getElementById("daily-label");
    if (dailyLabel) dailyLabel.innerText = `(for ${selectedDate})`;
    
    generateGroupedTable("monthly-table", allHistoryData.filter(r => (r.timestamp || "").startsWith(selectedMonth)), selectedMonth);
    generateGroupedTable("yearly-table", allHistoryData.filter(r => (r.timestamp || "").startsWith(selectedYear)), selectedYear);
}

function generateGroupedTable(elementId, dataArray, periodLabel) {
    const tbody = document.getElementById(elementId);
    if (!tbody) return;
    
    tbody.innerHTML = "";
    if (dataArray.length === 0) { tbody.innerHTML = "<tr><td colspan='4' class='text-center'>No data</td></tr>"; return; }
    let counts = {};
    dataArray.forEach(r => { 
        let name = r.itemName || r.item_name;
        counts[name] = (counts[name] || 0) + 1; 
    });
    let total = dataArray.length;
    for (let device in counts) {
        let pct = ((counts[device] / total) * 100).toFixed(1) + "%";
        tbody.innerHTML += `<tr><td class="fw-bold">${periodLabel}</td><td>${device}</td><td>${counts[device]}</td><td>${pct}</td></tr>`;
    }
}

// Start everything up!
init();