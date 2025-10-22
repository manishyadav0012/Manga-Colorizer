// DOM Elements
const urlInput = document.getElementById("url-input-field");
const maxActiveFetches = document.getElementById("maxactivefetches-input-field");
const showOriginalCheckbox = document.getElementById("showoriginal-checkbox");
const showColorizedCheckbox = document.getElementById("showcolorized-checkbox");
const cacheCheckbox = document.getElementById("cache-checkbox");
const denoiseCheckbox = document.getElementById("denoiser-checkbox");
const colorizeCheckbox = document.getElementById("colorizer-checkbox");
const upscaleCheckbox = document.getElementById("upscaler-checkbox");
const upscaleFactorSelector = document.querySelectorAll("input[name='upscale-factor']");
const upscaleFactorSelector2 = document.getElementById("upscale-factor-2");
const upscaleFactorSelector4 = document.getElementById("upscale-factor-4");
const denoiseSigmaInput = document.getElementById("denoisesigma-input-field");
const colorToleranceInput = document.getElementById("colortolerance-input-field");
const colorStrideInput = document.getElementById("colorstride-input-field");
const websitesInput = document.getElementById("websites-input-field");
const addSiteButton = document.getElementById("addsite");
const runButton = document.getElementById("run");
const testApiButton = document.getElementById("test-api");
const forceRunButton = document.getElementById("force-run");

// UI Enhancement functions
function addLoadingState(button, text = "Processing...") {
  const originalText = button.innerHTML;
  button.innerHTML = `<span class="btn-icon">⏳</span>${text}`;
  button.disabled = true;
  return () => {
    button.innerHTML = originalText;
    button.disabled = false;
  };
}

// Accordion functionality for Manga Sites section
function initializeAccordion() {
  const accordionHeader = document.getElementById('manga-sites-header');
  const accordionContent = document.getElementById('manga-sites-content');
  const accordionIcon = accordionHeader.querySelector('.accordion-icon');
  
  accordionHeader.addEventListener('click', () => {
    const isCollapsed = accordionContent.classList.contains('collapsed');
    
    if (isCollapsed) {
      // Expand accordion
      accordionContent.classList.remove('collapsed');
      accordionIcon.classList.add('rotated');
    } else {
      // Collapse accordion
      accordionContent.classList.add('collapsed');
      accordionIcon.classList.remove('rotated');
    }
  });
}

// Initialize accordion when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeAccordion);

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span class="notification-text">${message}</span>
    </div>
  `;
  
  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
    max-width: 300px;
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

chrome.storage.local.get(["apiURL", "maxActiveFetches", "showOriginal", "showColorized", "cache", "denoise",
                "colorize", "upscale", "denoiseSigma", "upscaleFactor",
                "colorTolerance", "colorStride", "websites"], (result) => {
    urlInput.value = result.apiURL || "";
    maxActiveFetches.value = result.maxActiveFetches || "1";
    showOriginalCheckbox.checked = result.showOriginal !== undefined ? result.showOriginal : false;
    showColorizedCheckbox.checked = result.showColorized !== undefined ? result.showColorized : true;
    cacheCheckbox.checked = result.cache !== undefined ? result.cache : false;
    denoiseCheckbox.checked = result.denoise !== undefined ? result.denoise : true;
    colorizeCheckbox.checked = result.colorize !== undefined ? result.colorize : true;
    upscaleCheckbox.checked = result.upscale !== undefined ? result.upscale : true;
    if (result.upscaleFactor === '2') {
        upscaleFactorSelector2.checked = true;
    } else if (result.upscaleFactor === '4') {
        upscaleFactorSelector4.checked = true;
    } else {
        upscaleFactorSelector4.checked = true;
    }
    denoiseSigmaInput.value = result.denoiseSigma || "25";
    colorToleranceInput.value = result.colorTolerance || "30";
    colorStrideInput.value = result.colorStride || "4";
    websitesInput.value = result.websites || "mangadex.org/chapter\nchapmanganelo.com\nfanfox.net" +
                            "\nmangakakalot.com\nsenkuro.com\nreadmanga.io\nmanhuatop.org";
    const sitesArray = websitesInput.value.split("\n");
    websitesInput.rows = sitesArray.length + 1
    websitesInput.cols = sitesArray.reduce((len, str) => { return Math.max(len, str.length) }, 25);
    addSiteButton.style.display = "none"
    chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
        if (tabs[0]?.url?.startsWith("http")) {
            const hostname = new URL(tabs[0].url).hostname;
            if (hostname && !websitesInput.value.includes(hostname)) {
                addSiteButton.innerText = "Add " + hostname;
                addSiteButton.removeAttribute("style");
                addSiteButton.addEventListener("click",() => {
                    addSiteButton.style.display = "none"
                    if (websitesInput.value.length > 0 && !websitesInput.value.endsWith("\n"))
                        websitesInput.value += "\n";
                    websitesInput.value += hostname;
                    chrome.storage.local.set({websites: websitesInput.value.trim()});
                });
            }
        }
    });
});

function updateVisibility() {
    const showOriginal = showOriginalCheckbox.checked;
    const showColorized = showColorizedCheckbox.checked;

    chrome.storage.local.set({
        showOriginal: showOriginalCheckbox.checked,
        showColorized: showColorizedCheckbox.checked,
    });

    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'toggleVisibility',
            showOriginal: showOriginal,
            showColorized: showColorized
        });
    });
}

testApiButton.addEventListener("click", () => {
    if (!urlInput.value.trim()) {
        showNotification('Please enter an API URL first', 'error');
        return;
    }
    
    const resetButton = addLoadingState(testApiButton, 'Testing...');
    
    chrome.tabs.create({url: urlInput.value, selected: true, active: true});
    chrome.storage.local.set({
        apiURL: urlInput.value.trim()
    });
    
    showNotification('API URL saved and opened in new tab', 'success');
    setTimeout(resetButton, 1000);
});

runButton.addEventListener("click", () => {
    if (!urlInput.value.trim()) {
        showNotification('Please enter an API URL first', 'error');
        return;
    }
    
    const resetButton = addLoadingState(runButton, 'Starting...');
    
    let selectedUpscaleFactor;
    upscaleFactorSelector.forEach((radio) => {
        if (radio.checked) {
            selectedUpscaleFactor = radio.value;
        }
    });

    chrome.storage.local.set({
        apiURL: urlInput.value.trim(),
        maxActiveFetches: maxActiveFetches.value.trim(),
        showOriginal: showOriginalCheckbox.checked,
        showColorized: showColorizedCheckbox.checked,
        cache: cacheCheckbox.checked,
        denoise: denoiseCheckbox.checked,
        colorize: colorizeCheckbox.checked,
        upscale: upscaleCheckbox.checked,
        upscaleFactor: selectedUpscaleFactor,
        denoiseSigma: denoiseSigmaInput.value.trim(),
        colorTolerance: colorToleranceInput.value.trim(),
        colorStride: colorStrideInput.value.trim(),
        websites: websitesInput.value.trim(),
        currentTab: true,
    });

    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'runColorizer',
        });
        showNotification('Colorization started! Check the page for results.', 'success');
        setTimeout(resetButton, 2000);
    });
});

forceRunButton.addEventListener('click', () => {
    if (!urlInput.value.trim()) {
        showNotification('Please enter an API URL first', 'error');
        return;
    }
    
    const resetButton = addLoadingState(forceRunButton, 'Select an Image');
    forceRunButton.disabled = true;
    
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "startSelectMode" });
        showNotification('Click on an image to colorize it', 'info');
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "exitSelectMode") {
        forceRunButton.innerHTML = '<span class="btn-icon">🎯</span>Force Colorize!';
        forceRunButton.disabled = false;
        showNotification('Image selection mode ended', 'info');
    }
});

showOriginalCheckbox.addEventListener('change', updateVisibility);
showColorizedCheckbox.addEventListener('change', updateVisibility);

// Accordion initialization removed - all content is now visible
