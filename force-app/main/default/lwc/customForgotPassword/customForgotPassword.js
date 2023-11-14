import { LightningElement, api, track } from 'lwc';

const DEBUG = true;

export default class CustomForgotPassword extends LightningElement {

    @track isInit;
    @track passwordChangeSuccess;
    @track hasOTP;
    @track enteredOTP;
    @track username;
    @track recaptchaToken;
    @track otpCode;
    @track newPassword;
    @track confirmNewPassword;
    @track showSpinner;


    @track otpResponseHandler;
    @track otpResponseErrorHandler;
    @track passwordChangeResponseErrorHandler;
    @track passwordChangeResponseHandler;
    @track grecaptchaVerifiedHandler;
    @track grecaptchaInitializedHandler;
    @track recaptchaDivElement;
    
    @api recaptchaSiteKey; 
    @api actionName;
    @api siteUrl;

    connectedCallback() {
        this.showSpinner = true;
        this.grecaptchaVerifiedHandler = this.handleGrecaptchaVerified.bind(this);
        document.addEventListener("grecaptchaVerified", this.grecaptchaVerifiedHandler);

        this.grecaptchaInitializedHandler = this.handleGrecaptchaInitialized.bind(this);
        document.addEventListener("grecaptchaInitialized", this.grecaptchaInitializedHandler);

        //Step 1: Dispatch event to initialize reCAPTCHA library with site key
        document.dispatchEvent(new CustomEvent("grecaptchaInit", {"detail": {"action": this.actionName,"recaptchaSiteKey":this.recaptchaSiteKey}}));
    }

    //Step 1.1: confirmation of reCAPTCHA library initialization completion
    handleGrecaptchaInitialized(e) {
        
        if(e.detail.action === this.actionName)
        {   
            this.isInit = true;
            this.showSpinner = undefined;
        }

    }

    //Step 2: When reset button is clicked and username entered, dispatch event to get reCAPTCHA token for One-Time password
    handleRequestOTP(e) {

        let inputCmp = this.template.querySelector('.username');
        inputCmp.setCustomValidity('');
        inputCmp.reportValidity();

        if(this.username !== undefined && this.username !== null && this.username.trim() !== '')
        {
            this.showSpinner = true;
            document.dispatchEvent(new CustomEvent("grecaptchaExecute", {"detail": {"action":this.actionName+'_otp',"recaptchaSiteKey":this.recaptchaSiteKey}}));
        }
        else 
        {
            inputCmp.setCustomValidity('Please enter your username.');
            inputCmp.reportValidity();
        }

    }

    handleRequestOTPResponse(response, username, forgotPasswordProcessStep) 
    {
        this.consoleLog(JSON.stringify(response), 'response from request ' + forgotPasswordProcessStep + ': ');
        if(response !== undefined && response !== null && response.status !== undefined && response.status !== null && response.status === 'success')
        {
            this.hasOTP = true;
        }
    }

    handleRequestOTPResponseError(response, username, forgotPasswordProcessStep) 
    {

        this.consoleLog(JSON.stringify(response), 'error from request ' + forgotPasswordProcessStep + ': ');
        let inputCmp = this.template.querySelector('.username');
        inputCmp.setCustomValidity('');
        inputCmp.reportValidity();
        if(response.invalid_request !== undefined && response.invalid_request !== null)
        {
            inputCmp.setCustomValidity(response.invalid_request);
            inputCmp.reportValidity();
        }
        
    }

    handlePasswordChangeResponse(response, username, forgotPasswordProcessStep)
    { 
        this.consoleLog(JSON.stringify(response), 'response from request ' + forgotPasswordProcessStep + ': ');

        if(response.status !== undefined && response.status !== null && response.status.trim() === 'success')
        {
            this.passwordChangeSuccess = true;
        }
    }

    handlePasswordChangeResponseError(response, username, forgotPasswordProcessStep)
    { 

        this.consoleLog(JSON.stringify(response), 'err from request ' + forgotPasswordProcessStep + ': ');
        
        let inputCmp = this.template.querySelector('.confirmNewPassword');
        inputCmp.setCustomValidity('');
        inputCmp.reportValidity();

        if(response.status_code !== undefined && response.status_code !== null)
        {
            if(response.status_code === 'password_policy_check_failure')
            {
                inputCmp.setCustomValidity(response.password_error);
                inputCmp.reportValidity();
            }
        }

    }

    handleResendCode(e) {
        this.hasOTP = undefined;
        this.enteredOTP = undefined;
    }

    handleReenterCode(e) {
        this.hasOTP = true;
        this.enteredOTP = undefined;
    }

    //Step 3: upon one time password entry and new password validation, dispatch event to get reCAPTCHA token for password update
    handleUpdatePassword(e)
    {
        if(this.otpCode !== undefined && this.otpCode !== null && this.otpCode.trim() !== '' &&
            this.confirmNewPassword !== undefined && this.confirmNewPassword !== null && this.confirmNewPassword.trim() !== '' && 
            this.newPassword !== undefined && this.newPassword !== null && this.newPassword.trim() !== '' && this.confirmNewPassword === this.newPassword)
        {
            this.showSpinner = true;
            document.dispatchEvent(new CustomEvent("grecaptchaExecute", {"detail": {"action":this.actionName+'_updatePassword',"recaptchaSiteKey":this.recaptchaSiteKey}}));
        }
    }

    forgotPasswordRequest(username, password, otp, recapchaToken, forgotPasswordProcessStep, callbackFunction, errorCallbackFunction) {

        let expDomain = this.siteUrl;
        let forgotPasswordURI = '/services/auth/headless/forgot_password';

        let client = new XMLHttpRequest();
        client.open("POST", expDomain + forgotPasswordURI, true);
        client.setRequestHeader("Content-Type", "application/json");
    
        let requestBody = {
        username: username,
        newpassword: password,
        otp: otp,
        recaptcha: recapchaToken
        }
    
        client.send(JSON.stringify(requestBody)); 
    
        var thisComponent = this;

        client.onreadystatechange = function() {
            try {
                if(client.readyState == 4) {
                    thisComponent.consoleLog(client.response, 'Client Response after ready state 4: ');
                    if (client.status == 200) {
                        callbackFunction(JSON.parse(client.response), username, forgotPasswordProcessStep);
                    } else {
                        errorCallbackFunction(JSON.parse(client.response), username, forgotPasswordProcessStep);
                    }
                    thisComponent.showSpinner = undefined;
                } 
            } catch(err){
                thisComponent.consoleLog(err+'', 'readystatechange function error: ');
            }
        }
    }

    handleUsernameChange(e) {
        this.username = e.target.value.trim();
    }

    handleotpCodeChange(e) {
        this.otpCode = e.target.value.trim();
        let inputCmp = this.template.querySelector('.otp');
        inputCmp.setCustomValidity('');
        inputCmp.reportValidity();

        if(this.otpCode === undefined || this.otpCode === null || this.otpCode.trim() === '')
        {
            inputCmp.setCustomValidity('Please enter the One Time Password.');
            inputCmp.reportValidity();
        }
    }

    handleNext(e) {

        let inputCmp = this.template.querySelector('.otp');
        inputCmp.setCustomValidity('');
        inputCmp.reportValidity();

        if(this.otpCode !== undefined && this.otpCode !== null && this.otpCode.trim() !== '')
        {
            this.enteredOTP = true;
        }
        else {
            inputCmp.setCustomValidity('Please enter the One Time Password.');
            inputCmp.reportValidity();
        }

    }

    handleAlreadyHaveCode(e) {
        
        let inputCmp = this.template.querySelector('.username');
        inputCmp.setCustomValidity('');
        inputCmp.reportValidity();

        if(this.username !== undefined && this.username !== null && this.username.trim() !== '')
        {
            this.hasOTP = true;
        }
        else 
        {
            inputCmp.setCustomValidity('Please enter your username.');
            inputCmp.reportValidity();
        }
    }

    handleNewPasswordChange(e) {
        this.newPassword = e.target.value.trim();
        
        let inputCmp = this.template.querySelector('.confirmNewPassword');
        inputCmp.setCustomValidity('');
        inputCmp.reportValidity();

        if(this.confirmNewPassword !== undefined && this.confirmNewPassword !== null && this.confirmNewPassword.trim() !== '' && 
        this.newPassword !== undefined && this.newPassword !== null && this.newPassword.trim() !== '')
        {
              if (this.newPassword.length < 8) {
                inputCmp.setCustomValidity('Password should be at least 8 characters long.');
              } 
              if (!/[A-Z]/.test(this.newPassword)) {
                inputCmp.setCustomValidity('Password should contain at least one uppercase letter.');
              } 
              if (!/[0-9]/.test(this.newPassword)) {
                inputCmp.setCustomValidity('Password should contain at least one numeric digit.');
              } 
              if (this.confirmNewPassword !== this.newPassword) {
                inputCmp.setCustomValidity('Passwords do not match.');
              }
            
            inputCmp.reportValidity();
        }
    }

    handleConfirmNewPasswordChange(e) {
        this.confirmNewPassword = e.target.value.trim();

        let inputCmp = this.template.querySelector('.confirmNewPassword');
        inputCmp.setCustomValidity('');
        inputCmp.reportValidity();

        if(this.confirmNewPassword !== undefined && this.confirmNewPassword !== null && this.confirmNewPassword.trim() !== '' && 
        this.newPassword !== undefined && this.newPassword !== null && this.newPassword.trim() !== '' && this.confirmNewPassword !== this.newPassword)
        {
            inputCmp.setCustomValidity('Passwords do not match.');
            inputCmp.reportValidity();
        }
    }

    //Step 2.1, 3.1: Event listener for reCAPTCHA token generation to process next step of OTP or password update request
    handleGrecaptchaVerified(e)
    {
        if(e.detail.action.indexOf(this.actionName) > -1 && e.detail.recaptchaSiteKey === this.recaptchaSiteKey && e.detail.response !== undefined && e.detail.response !== null)
        {
            
            this.recaptchaToken = e.detail.response;
            this.consoleLog(this.recaptchaToken, 'token: ');
            document.dispatchEvent(new Event("grecaptchaReset"));

            if(e.detail.action === (this.actionName + '_otp'))
            {
                this.otpResponseHandler = this.handleRequestOTPResponse.bind(this);
                this.otpResponseErrorHandler = this.handleRequestOTPResponseError.bind(this);
                this.forgotPasswordRequest(this.username, null, null, this.recaptchaToken, 'requestOTP', this.otpResponseHandler, this.otpResponseErrorHandler);
            } 
            else if(e.detail.action === (this.actionName + '_updatePassword'))
            {
                this.username = (this.username !== undefined && this.username !== null && this.username.trim() !== '') ? this.username : null;
                this.passwordChangeResponseHandler = this.handlePasswordChangeResponse.bind(this);
                this.passwordChangeResponseErrorHandler = this.handlePasswordChangeResponseError.bind(this);
                this.forgotPasswordRequest(this.username, this.confirmNewPassword, this.otpCode, this.recaptchaToken, 'updatePassword', this.passwordChangeResponseHandler, this.passwordChangeResponseErrorHandler);
            }
            else 
            {
                this.showSpinner = undefined;
            }

        }

        

    }

    consoleLog(text = '', before = '', after = '')
    {
        if(DEBUG === true)
        {
            console.log(before + text + after);
        }
    }

}