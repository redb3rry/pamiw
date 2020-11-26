document.addEventListener('DOMContentLoaded', function (event) {

    const GET = "GET";
    const POST = "POST";
    const URL = "/";
    const LOGIN_FIELD_ID = "login";

    let registrationForm = document.getElementById("registration-form");

    var HTTP_STATUS = {OK: 200, CREATED: 201, NOT_FOUND: 404};

    let correctCheck = [false, false, false, false];

    const registerButton = document.getElementById("button-reg-form");
    registerButton.disabled = true;
    prepareEventOnLoginChange();
    prepareEventOnPeselChange();
    prepareEventOnPasswordChange();
    prepareEventOnSecondPasswordChange();

    registrationForm.addEventListener("submit", function (event) {
        event.preventDefault();
        console.log("Stopped default form submission.");
        let data = new FormData(registrationForm);
        submitRegistrationForm(data);
    });

    function submitRegistrationForm(data) {
        let url = URL + "registration"
        let params = {
            method: POST,
            body: data,
            redirect: "follow"
        }
        fetch(url, params).then(function (resp){
            console.log("Response: " + resp.status);
            if(resp.status === HTTP_STATUS.OK || resp.status === HTTP_STATUS.CREATED){
                showRegistrationMessage();
                return resp.json();
            } else{
                console.error("Response status code: " + resp.status);
                throw "Unexpected response status: " + resp.status;
            }

        }).catch(function (err) {
            console.log("Error: " + err);
            return err.status;
        })
    }

    function showRegistrationMessage(){
        let messageBox = document.getElementById("messageBox");

        if(messageBox === null) {
            let message = document.createTextNode("Registered successfully!");
            messageBox = document.createElement("div");
            messageBox.setAttribute("id", "messageBox");
            messageBox.className = "message-box";
            messageBox.appendChild(message);
        }
        let elem = document.getElementById("button-reg-form");
        elem.insertAdjacentElement("afterend", messageBox);
    }

    function prepareEventOnLoginChange(){
        let loginInput = document.getElementById(LOGIN_FIELD_ID);
        loginInput.addEventListener("change", updateLoginAvailabilityMessage);
    }

    function updateLoginAvailabilityMessage() {
        let warningElemId = "loginWarning";
        let warningMessage = "This login is taken.";

        isLoginAvailable().then(function (isAvailable){
            if (isAvailable && isLoginCorrect()){
                console.log("Login available!");
                removeWarning(warningElemId);
                correctCheck[0] = true;
                if(checkIfAllCorrect()){
                    registerButton.disabled = false;
                }
            } else {
                console.log("Login not available.");
                if(isLoginCorrect()) {
                    showWarningMessage(warningElemId, warningMessage, LOGIN_FIELD_ID)
                } else {
                    showWarningMessage(warningElemId,"Login incorrect", LOGIN_FIELD_ID)
                }
                correctCheck[0] = false;
                if(checkIfAllCorrect()){
                    registerButton.disabled = true;
                }
            }
        }).catch(function (error){
            console.error("Something went wrong while checking login availability.");
            console.error(error);
        })
    }

    function showWarningMessage(newElemId, message, field_id){
        let warningElem = prepareWarning(newElemId, message);
        appendAfterElem(field_id, warningElem);
    }

    function removeWarning(warningElemId){
        let warningElem = document.getElementById(warningElemId);

        if(warningElem != null){
            warningElem.remove();
        }
    }

    function prepareWarning(newElemId, message){
        let warningField = document.getElementById(newElemId);

        if (warningField === null){
            let textMessage = document.createTextNode(message);
            warningField = document.createElement('span');

            warningField.setAttribute("id", newElemId);
            warningField.className = "warning-field";
            warningField.appendChild(textMessage);
        }
        return warningField;
    }

    function prepareEventOnPeselChange(){
        let peselInput = document.getElementById("pesel");
        peselInput.addEventListener("change", updatePeselCheckMessage);
    }

    function updatePeselCheckMessage() {
        let warningElemId = "peselWarning"
        let warningMessage = "Pesel number is incorrect"

        if (isPeselCorrect()){
            console.log("Pesel correct!");
            removeWarning(warningElemId);
            correctCheck[1] = true;
            if(checkIfAllCorrect()){
                registerButton.disabled = false;
            }
        } else {
            console.log("Pesel incorrect!");
            showWarningMessage(warningElemId,warningMessage,"pesel");
            correctCheck[1] = false;
            if(checkIfAllCorrect()){
                registerButton.disabled = true;
            }
        }
    }

    function prepareEventOnPasswordChange(){
        let passwordInput = document.getElementById("password");
        passwordInput.addEventListener("change", updatePasswordCheckMessage);
    }
    function updatePasswordCheckMessage(){
        let warningElemId = "passwordWarning";
        let warningMessage = "Password is incorrect"

        if(isPasswordCorrect()){
            console.log("Password correct!");
            removeWarning(warningElemId)
            correctCheck[2] = true;
            if(checkIfAllCorrect()){
                registerButton.disabled = false;
            }
        } else {
            console.log("Password incorrect!")
            showWarningMessage(warningElemId,warningMessage,"password");
            correctCheck[2] = false;
            if(checkIfAllCorrect()){
                registerButton.disabled = true;
            }
        }
    }

    function isPasswordCorrect(){
        let password = document.getElementById("password").value;
        if(password.length < 8){
            return false;
        }
        return isStrongPassword(password)
    }

    function isStrongPassword(c){
        let format = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%&\*])(?=.{8,})");
        console.log(c.match(format) + " " + format.test(c));
        return format.test(c);
    }
    function isLettersOnly (c){
        return /^[a-zA-Z]+$/.test(c);
    }
    function prepareEventOnSecondPasswordChange(){
        let passwordInput = document.getElementById("second_password");
        passwordInput.addEventListener("change", updateSecondPasswordCheckMessage);
    }
    function updateSecondPasswordCheckMessage(){
        let warningElemId = "secondPasswordWarning";
        let warningMessage = "Repeated password is incorrect"

        if(isSecondPasswordCorrect()){
            console.log("Password correct!");
            removeWarning(warningElemId)
            correctCheck[3] = true;
            if(checkIfAllCorrect()){
               registerButton.disabled = false;
            }
        } else {
            console.log("Password incorrect!")
            showWarningMessage(warningElemId,warningMessage,"second_password");
            correctCheck[3] = false;
            if(checkIfAllCorrect()){
                registerButton.disabled = true;
            }
        }
    }

    function isSecondPasswordCorrect(){
        let password = document.getElementById("password").value;
        let secondPassword = document.getElementById("second_password").value;

        return password === secondPassword;
    }

    function appendAfterElem(currentElemId, newElem){
        let currentElem = document.getElementById(currentElemId);
        currentElem.insertAdjacentElement('afterend', newElem);
    }

    function isPeselCorrect() {
        let pesel = document.getElementById("pesel").value;
        if (pesel.length !== 11){
            return false;
        }
        let controlSum = 0;
        let controlNum = Number(pesel.charAt(10));
        let controlArr = [1,3,7,9,1,3,7,9,1,3]
        for(let i = 0; i < pesel.length-1; i++){
            controlSum += Number(pesel.charAt(i))*controlArr[i];
        }

        controlSum = 10 - (controlSum % 10);
        return controlSum === controlNum;
    }
    function isLoginCorrect(){
        let login = document.getElementById("login").value;
        return isLettersOnly(login) && login.length>=4;
    }

    function isLoginAvailable() {
        return Promise.resolve(checkLoginAvailability().then(function (statusCode){
            console.log(statusCode);
            if (statusCode === HTTP_STATUS.OK){
                return false;
            } else if (statusCode === HTTP_STATUS.NOT_FOUND){
                return true
            } else {
                throw "Unknown login availability status: " + statusCode;
            }
        }));
    }

    function checkLoginAvailability() {
        let loginInput = document.getElementById("login");
        let baseUrl = URL + "login/check/";
        let userUrl = baseUrl + loginInput.value;

        return Promise.resolve(fetch(userUrl, {method: GET}).then(function (res){
            return res.status;
        }).catch(function (err){
            return err.status;
        }));
    }
    function checkIfAllCorrect() {
        return correctCheck.every(e => e === true);
    }
});