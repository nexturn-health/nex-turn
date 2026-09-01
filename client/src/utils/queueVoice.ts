export type VoiceLanguage =
    | "EN"
    | "HI"
    | "BN"
    | "TA"
    | "TE"
    | "MR"
    | "GU"
    | "KN"
    | "ML"
    | "PA";


const languageMap:
    Record<
        VoiceLanguage,
        string
    > = {

    EN: "en-IN",

    HI: "hi-IN",

    BN: "bn-IN",

    TA: "ta-IN",

    TE: "te-IN",

    MR: "mr-IN",

    GU: "gu-IN",

    KN: "kn-IN",

    ML: "ml-IN",

    PA: "pa-IN",

};


// ========================================
// ANNOUNCE TOKEN
// ========================================

export const announceToken =
    (
        token: string,
        room?: string,
        language:
            VoiceLanguage = "EN",
    ) => {

        if (
            typeof window ===
            "undefined"
        ) {
            return;
        }


        if (
            !("speechSynthesis" in window)
        ) {
            return;
        }


        window.speechSynthesis.cancel();


        const lang =
            languageMap[language];


        let message = "";


        switch (language) {

            case "HI":

                message =
                    `टोकन ${token} कृपया ${room || "डॉक्टर के कमरे"} में जाएं।`;

                break;


            case "BN":

                message =
                    `টোকেন ${token}, অনুগ্রহ করে ${room || "ডাক্তারের কক্ষে"} যান।`;

                break;


            case "TA":

                message =
                    `டோக்கன் ${token}, தயவுசெய்து ${room || "மருத்துவர் அறைக்கு"} செல்லவும்।`;

                break;


            case "TE":

                message =
                    `టోకెన్ ${token}, దయచేసి ${room || "డాక్టర్ గదికి"} వెళ్లండి।`;

                break;


            case "MR":

                message =
                    `टोकन ${token}, कृपया ${room || "डॉक्टरांच्या खोलीत"} जा.`;

                break;


            case "GU":

                message =
                    `ટોકન ${token}, કૃપા કરીને ${room || "ડૉક્ટરના રૂમમાં"} જાઓ.`;

                break;


            case "KN":

                message =
                    `ಟೋಕನ್ ${token}, ದಯವಿಟ್ಟು ${room || "ವೈದ್ಯರ ಕೊಠಡಿಗೆ"} ಹೋಗಿ.`;

                break;


            case "ML":

                message =
                    `ടോക്കൺ ${token}, ദയവായി ${room || "ഡോക്ടറുടെ മുറിയിലേക്ക്"} പോകുക.`;

                break;


            case "PA":

                message =
                    `ਟੋਕਨ ${token}, ਕਿਰਪਾ ਕਰਕੇ ${room || "ਡਾਕਟਰ ਦੇ ਕਮਰੇ ਵਿੱਚ"} ਜਾਓ।`;

                break;


            default:

                message =
                    `Token ${token}, please proceed to ${room || "the doctor's room"}.`;

                break;

        }


        const speech =
            new SpeechSynthesisUtterance(
                message,
            );


        speech.lang =
            lang;

        speech.rate =
            0.85;

        speech.pitch =
            1;

        speech.volume =
            1;


        const voices =
            window
                .speechSynthesis
                .getVoices();


        const preferredVoice =
            voices.find(
                (voice) =>
                    voice.lang
                        .toLowerCase()
                        .startsWith(
                            lang
                                .toLowerCase()
                                .split("-")[0],
                        ),
            );


        if (
            preferredVoice
        ) {

            speech.voice =
                preferredVoice;

        }


        window
            .speechSynthesis
            .speak(
                speech,
            );

    };