// Global variables
var active;
var router;
var sessionID;
var resultPage;
var responseForms;
var formMessages;
var backButtons;
var lang = 'en';
var request = superagent;
var requestHeaders = {
    'Accept': 'application/json'
}

var onDocumentLoad = function(e) {
    var routes = {
        '/:cardID': navigateToCard
    }

    router = Router(routes);
    router.init([COPY.content.initial_card]);

    checkIfVisited();

    var againLink = document.getElementsByClassName('submit-again-link')[0];
    againLink.addEventListener('click', startProcessOver);

    listenResponseFormSubmit();
}

var startProcessOver = function(e) {
    e.preventDefault();

    resultPage = null;
    lscache.remove('cachedResult');

    toggleFormVisibility(true);

    router.setRoute('water-meter');
}

var checkIfVisited = function() {
    var cachedResult = lscache.get('resultPage');
    if (cachedResult && cachedResult !== 'undefined') {
        router.setRoute(cachedResult);
        toggleFormVisibility(false);
    }
}

var navigateToCard = function(cardID) {
    document.body.scrollTop = 0;
    var nextCard = document.getElementById(cardID);
    if (nextCard) {
        if (active) {
            active.classList.remove('active');
        }
        nextCard.classList.add('active');
        active = nextCard;

        backButtons = document.getElementsByClassName('back');
        listenBackButtonClick();

        responseForms = document.getElementsByClassName('user-info');
        formMessages = document.getElementsByClassName('submit-message');

        if (nextCard.querySelector('form.user-info')) {
            makeSessionID();
        }

        ANALYTICS.trackEvent('navigate', cardID);
    } else {
        console.error('Route "' + cardID + '" does not exist');
    }
    if (!APP_CONFIG.DEBUG) {
        router.setRoute('');
    }
}

var listenBackButtonClick = function() {
    for (var i = 0; i < backButtons.length; i++) {
        var backButton = backButtons[i];
        backButton.addEventListener('click', onBackButtonClick);
    }
}


var onBackButtonClick = function(e) {
    e.preventDefault();
    window.history.go(-1);
}

var makeSessionID = function() {
    var storedID = lscache.get('sessionID');
    if (!storedID || storedID === 'undefined') {
        request
            .get(APP_CONFIG.LEADPIPES_API_BASEURL + '/uuid')
            .set(requestHeaders)
            .end(handleSessionRequest);
    } else {
        toggleFormVisibility(false);
    }
}

var handleSessionRequest = function(err, res) {
    if (err || !res.ok) {
        console.error('ajax error', err, res);
    } else {
        sessionID = res.body;
    }
}

var listenResponseFormSubmit = function() {
    for (var i = 0; i < responseForms.length; i++) {
        var responseForm = responseForms[i];
        responseForm.addEventListener('submit', onSubmitResponseForm);
    }
}

var onSubmitResponseForm = function(e, data) {
    e.preventDefault();
    var data = serialize(e.target);
    data.sessionid = lscache.get('sessionID');
    // TODO add hash id of user's result page to posted data
    resultPage = 'lead';
    data['resultPage'] = resultPage;

    request
        .post(APP_CONFIG.LEADPIPES_API_BASEURL + '/form')
        .send(data)
        .set(requestHeaders)
        .set('Content-Type', 'application/json')
        .end(handleSubmitResponse);

}

var handleSubmitResponse = function(err, res) {
    toggleFormVisibility(false);
    // Reset ttl
    lscache.set('resultPage', resultPage, APP_CONFIG.LEADPIPES_SESSION_TTL);
}

var toggleFormVisibility = function(formVisible) {
    for (var i = 0; i < responseForms.length; i++) {
        var responseForm = responseForms[i];
        var formMessage = formMessages[i];

        if (formVisible) {
            responseForm.className = 'user-info';
            formMessage.className += ' message-hidden';
            responseForm.reset();
        } else {
            responseForm.className += ' form-hidden';
            formMessage.className = 'submit-message';
        }
    }
}

document.addEventListener('DOMContentLoaded', onDocumentLoad);
