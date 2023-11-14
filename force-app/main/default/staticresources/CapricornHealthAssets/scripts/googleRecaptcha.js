//method to dynamically load script into site head markup
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.charset = 'utf-8';
        script.type = 'text/javascript';
        document.head.appendChild(script);
        script.addEventListener('load', resolve);
        script.addEventListener('error', reject);
    })
}

//Step 1.1: reCAPTCHA Initialization complete event response
var grecaptchaCounter = 0;
function grecaptchaInitializationComplete(e) {
    if(grecaptchaCounter < 10)
    {
        if(typeof grecaptcha === 'undefined') {
            grecaptchaCounter++;
            setTimeout(grecaptchaInitializationComplete, 1000, e);
        } else {
            document.dispatchEvent(new CustomEvent('grecaptchaInitialized',{'detail': {action:e.detail.action, recaptchaSiteKey:e.detail.recaptchaSiteKey}}));
        }
    }
}

//Step 1: reCAPTCHA Initialization listener
document.addEventListener('grecaptchaInit', function(e) { 
    loadScript('https://www.google.com/recaptcha/api.js?render=' + e.detail.recaptchaSiteKey);
    
    grecaptchaInitializationComplete(e);
    
});

//Step 2,3: reCAPTCHA token generation listener and event response
document.addEventListener('grecaptchaExecute', function(e) {
          
        grecaptcha.execute(e.detail.recaptchaSiteKey, {action: e.detail.action}).then(function(token) {
            document.dispatchEvent(new CustomEvent('grecaptchaVerified', {'detail': {response: token, action:e.detail.action, recaptchaSiteKey:e.detail.recaptchaSiteKey}}));
        });
    
}); 

document.addEventListener('grecaptchaReset', function() {
    try {
        grecaptcha.reset();
    } catch(err){}
}); 