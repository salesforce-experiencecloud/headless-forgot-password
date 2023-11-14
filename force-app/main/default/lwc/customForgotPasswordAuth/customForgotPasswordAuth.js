import { LightningElement, track, api } from 'lwc';
import doForgotPassword from '@salesforce/apex/headlessForgotPasswordController.doForgotPassword';

const DEBUG = true;

export default class CustomForgotPasswordAuth extends LightningElement {

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
        this.grecaptchaVerifiedHandler = this.handleGrecaptchaVerified.bind(this);
        document.addEventListener("grecaptchaVerified", this.grecaptchaVerifiedHandler);

        this.grecaptchaInitializedHandler = this.handleGrecaptchaInitialized.bind(this);
        document.addEventListener("grecaptchaInitialized", this.grecaptchaInitializedHandler);

        //Step 1: Dispatch event to initialize reCAPTCHA library with site key
        document.dispatchEvent(new CustomEvent("grecaptchaInit", {"detail": {"action":this.actionName,"recaptchaSiteKey":this.recaptchaSiteKey}}));
    }

    //Step 1.1: confirmation of reCAPTCHA library initialization completion
    handleGrecaptchaInitialized(e) {

        if(e.detail.action === this.actionName)
        {   
            this.isInit = true;
            this.showSpinner = undefined;
        }

    }
    

    handleUsernameChange(e) {
        this.username = e.target.value.trim();
    }

    //Step 2: When reset button is clicked and username entered, dispatch event to get reCAPTCHA token for One-Time password
    handleRequestOTP(e) {

        let inputCmp = this.template.querySelector('.username');
        inputCmp.setCustomValidity('');
        inputCmp.reportValidity();

        if(this.username !== undefined && this.username !== null && this.username.trim() !== '')
        {
            this.showSpinner = true;
            document.dispatchEvent(new CustomEvent("grecaptchaExecute", {"detail": {"action":this.actionName + '_otp',"recaptchaSiteKey":this.recaptchaSiteKey}}));
        }
        else 
        {
            inputCmp.setCustomValidity('Please enter your username.');
            inputCmp.reportValidity();
        }

    }

    //Step 2.1, 3.1: Event listener for reCAPTCHA token generation to process next step of OTP or password update apex controller method call
    handleGrecaptchaVerified(e)
    {
        if(e.detail.action === (this.actionName + '_otp') && e.detail.response !== undefined && e.detail.response !== null)
        {
            this.recaptchaToken = e.detail.response;
            //call apex method with token to send otp String siteUrl, String username, String token, String otp, String password
            doForgotPassword({
                siteUrl: this.siteUrl,
                username: this.username,
                token: this.recaptchaToken,
                otp: null,
                password: null
            }).then(result => {
                    if(result === 'success')
                    {
                        this.hasOTP = true;
                        this.showSpinner = undefined;
                    }
                    else 
                    {
                        this.consoleLog(result+'','error in api: ');
                    }
                })
                .catch(error => {
                    this.consoleLog(error+'','error in apex method: ');
                });
        }
        else if(e.detail.action === (this.actionName + '_updatePassword') && e.detail.response !== undefined && e.detail.response !== null)
        {
            this.recaptchaToken = e.detail.response;
            //call apex method with token to send otp String siteUrl, String username, String token, String otp, String password
            doForgotPassword({
                siteUrl: this.siteUrl,
                username: this.username,
                token: this.recaptchaToken,
                otp: this.otpCode,
                password: this.confirmNewPassword
            }).then(result => {
                    if(result === 'success')
                    {
                        this.passwordChangeSuccess = true;
                        this.showSpinner = undefined;
                    }
                    else 
                    {
                        this.consoleLog(result+'','error in api: ');
                    }
                })
                .catch(error => {
                    this.consoleLog(error+'','error in apex method: ');
                });
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

    handleResendCode(e) {
        this.hasOTP = undefined;
        this.enteredOTP = undefined;
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

    consoleLog(text = '', before = '', after = '')
    {
        if(DEBUG === true)
        {
            console.log(before + text + after);
        }
    }

}