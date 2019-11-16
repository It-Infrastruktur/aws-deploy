
const Alexa = require('ask-sdk-core');
const Jenkins = require('jenkins')({ baseUrl: 'http://user:bitnami@3.90.8.63:80/jenkins', crumbIssuer: true });
//const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Hello! I am your Deployment Helper. How can I help you?';
        const repromptText = 'You can ask me to deploy a project or give you the status of a build. Just say deploy or build and give me the job name'; 
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptText)
            .getResponse();
    }
};

/*const handler1 = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'IntentName';
    },
    async handle(handlerInput) {        
        const speakOutput = '';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};*/

const deployHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'deploy';
    },
    async handle(handlerInput) {     
        let projectName = handlerInput.requestEnvelope.request.intent.slots.project.value
        let deployNo = null
        let speakOutput = null

        projectName = await replaceMinus( projectName )

        if( Jenkins.job.exists( projectName ) ){
            await Jenkins.job.build( projectName, function( err, data ){
                if (err) speakOutput = `Sorry, an error occured while deploying the project ${projectName}.`;
                deployNo = data
                speakOutput = `Ok, i have deployed the project ${projectName}. The build number is ${deployNo}.`;
            })
            
        }else{
            speakOutput = `Sorry, there is no job with the name ${projectName}. Please try again or check your jenkins logs.` 
        }
        

        
        const repromtOutput = `If you want to get the status of the build, say status ${projectName}. Or let me deploy another project for you.`
       // const successMsg = `Thank you for waiting. The project ${projectName} was successfully deployed.`
       // const failMsg = `Sorry. The project ${projectName} failed. Please check your settings in your jenkins log for more details.` 
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromtOutput)
            .getResponse();
    }
}

const getLastBuildStatus = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'lastBuildStatus';
    },
    async handle(handlerInput) {
        let projectName = handlerInput.requestEnvelope.request.intent.slots.project.value        
        let speakOutput = null;

        if( Jenkins.job.exists( projectName )){
            await Jenkins.job.get( projectName, function(err, data) {
                if (err) speakOutput = `Sorry, an error occured while asking for the Status of the project ${projectName}.`;
                if( data.lastBuild.number == data.lastSuccessfulBuild.number ){
                  speakOutput = `Your last build was successful for project ${projectName}`;  
                }else{
                    speakOutput = `The last build of this project wasn't successfull. The last successfull build of your project was ${data.lastSuccessfulBuild.number}. `
                }
                
            }); 
        }
        

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

/*
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};
*/

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/*
Helpers
*/

const replaceMinus( p_sProjectName ){
    let projectName = p_sProjectName

    if( projectName.includes( ' minus ' )){
            projectName = projectName.split( ' minus ' )
            projectName = projectName.join( '-' )
    }

    return projectName;
}

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    /*.withPersistenceAdapter(
        new persistenceAdapter.S3PersistenceAdapter({bucketName:process.env.S3_PERSISTENCE_BUCKET})
    )*/
    .addRequestHandlers(
        LaunchRequestHandler,
        deployHandler,
        
    )
    .addErrorHandlers(
        ErrorHandler
    )
    .lambda();
