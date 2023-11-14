public with sharing class headlessForgotPasswordController {
    
    //Step 2.2, 3.2 execute Headless forgot password API callout after anti-spam verification
    @AuraEnabled
    public static string doForgotPassword(String siteUrl, String username, String token, String otp, String password){
        try {
            //Step 2.2.1, 3.2.1 Verify anti-spam token
            String verifyResponse = verifyToken(token);
            if(verifyResponse != null && verifyResponse == 'Success')
            {
                //Step 2.2.2, 3.2.2 prepare and execute Headless Forgot Password request
                String response = forgotPasswordRequest(siteUrl, username, otp, password);
                Map<String,Object> responseMap = (Map<String,Object>) System.JSON.deserializeUntyped(response);
                if(responseMap.keySet().contains('status'))
                {
                    String statusCode = (String)responseMap.get('status');
                    if(statusCode == 'success')
                    {
                        return 'success';
                    }
                }
                return response;
            }
            else
            {
                return verifyResponse;
            }
        } catch (Exception e) {
            return e+'';
        }
    }


    private static String verifyToken(String token) 
    {

        String recaptchaSecretKey = '6LflLewnAAAAAD6HOK9_vG3-Ub4c9j5J_8GRd56J'; //harcoded for POC only

        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint('https://www.google.com/recaptcha/api/siteverify');
        request.setMethod('POST');
        request.setBody('secret=' + recaptchaSecretKey + '&response=' + token);
        HttpResponse response = http.send(request);

        if (response.getStatusCode() == 200) {
            System.debug(response.getBody());
            Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(response.getBody());

            if (result.containsKey('success') && result.get('success') == true) {
                if (result.containsKey('score')) {
                    //score logic is only needed/returned for v3 (0.0 - 1.0)
                    //https://developers.google.com/recaptcha/docs/v3
                    //TODO: verify action name for the request
                    String action = (String)result.get('action');
                    //TODO: get threshold configuration for each action
                    Decimal threshold = .4;
                    Decimal score = (Decimal)result.get('score');
                    if (score > threshold) {
                        //TODO: perform action on record
                        
                        return 'Success';
                    }
                } else {
                    //TODO: perform action on record
                    
                    return 'Invalid Verification - no score';
                }
            } else {
                return 'Invalid Verification - failed';
            }
        }
        //consider letting this through
        return 'Invalid Verification Request';
        

    }

    private static String forgotPasswordRequest(String siteUrl, String username, String otp, String password) {

        Map<String,String> requestBodyMap = new Map<String,String>();
        requestBodyMap.put('username', username);
        if(otp != null)
        {
            requestBodyMap.put('otp', otp);
        }
        if(password != null)
        {
            requestBodyMap.put('newpassword', password);
        }

        //get access token for Headless Forgot Password API callout
        String accessToken = getAccessToken();
        //execute Headless Forgot Password API callout with access token authentication
        HTTPResponse response = proxyRequest(System.JSON.serialize(requestBodyMap), accessToken, siteUrl);
        return response.getBody();
    }

    private static HTTPResponse proxyRequest(String requestBody, String accessToken, String siteUrl) {    
        
        Http h = new Http();
        HttpRequest req = new HttpRequest();
        req.setMethod('POST');
        
        String url = siteUrl + '/services/auth/headless/forgot_password'; 
        req.setEndpoint(url);
        
        //req.setBody(proxyRequest.requestBody.toString()); 
        //req.setBody(JSON.serialize(request)); 
        req.setBody(requestBody); 
        
        //Add Headers
        req.setHeader('Content-Type','application/json'); 
        req.setHeader('Authorization','Bearer ' + accessToken); 
        
        //Send Authorzation Request
        HttpResponse res = h.send(req);
        return res;         
    }

    private static String getAccessToken() {
        Auth.JWT jwt = new Auth.JWT();
        //do not hardcode, make configurable
        jwt.setSub('admin@ecdf.demo.101'); 
        //do not hardcode, make configurable
        jwt.setAud('https://login.salesforce.com');  
        //do not hardcode, make configurable (client ID of connected app)
        jwt.setIss('3MVG9SemV5D80oBdLH2z7Jayd56YB_OIomPEZW501oGaneUXBf0Xf0KgArbOHQxZlvBJyTxdPP41C1SIAHnPq'); 
        
        //Additional claims to set scope
        Map<String, Object> claims = new Map<String, Object>();
        claims.put('scope', 'forgot_password');
            
        jwt.setAdditionalClaims(claims);

        //Create the object that signs the JWT bearer token, hardcoded cert dev name for POC
        //do not hardcode, make configurable (dev name of self-signed certificate)
        Auth.JWS jws = new Auth.JWS(jwt, 'Headless_Forgot_Password'); 
        
        //Get the resulting JWS in case debugging is required
        String token = jws.getCompactSerialization();
        //system.debug('jwt token: ' + token);

        //Set the token endpoint that the JWT bearer token is posted to
        //do not hardcode, make configurable, site domain and oauth endpoint
        String tokenEndpoint = 'https://capricornhealth-a2.my.salesforce.com/services/oauth2/token'; 
        
        //POST the JWT bearer token
        Auth.JWTBearerTokenExchange bearer = new Auth.JWTBearerTokenExchange(tokenEndpoint, jws);
        
        //Get the access token
        String accessToken = bearer.getAccessToken();
        //system.debug('access token: ' + accessToken);

        return accessToken; 
    }

}