setInterval(function() {
    
    let demoElements = document.querySelectorAll('.v2KPX.lTzTl');
    demoElements.forEach(function(el) {
        if (el.textContent.trim().toUpperCase() === 'DEMO') {
            el.textContent = 'LIVE';
            el.style.color = '#0ba861'; 
        }
    });


    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while(node = walker.nextNode()) {

// Code by @JubairZ telegram
        if(node.nodeValue.includes('$10,000.00')) {
            node.nodeValue = node.nodeValue.replace('$10,000.00', '$5,450.00'); 
        }
    }
}, 50); 
