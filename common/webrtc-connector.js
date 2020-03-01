import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';
import "./webrtc-messenger.js";
const iceConfiguration = {
    'iceServers': [
        {
            'urls': ['stun:stun.l.google.com:19302']
        }
    ]
}
class WebRTCConnector extends LitElement {
    static get properties() {
        return {
            showEstablishment: { type: Boolean },
            offerer: { type: Boolean },
            answerer: { type: Boolean },
            codeValue: { type: String },
            codeSource: { type: String },
            dataChannel: { type: RTCDataChannel },
            showQRScanner: { type: Boolean },
        };
    }
    constructor(){
        super();
        this.showEstablishment = true;
        this.showQRScanner = false;
        this.codeSource = "https://www.w3schools.com/tags/smiley.gif"
        this.codeValue = ""
        this.jsonLink = undefined
        this.answer = ""
        this.init()
    }
    render() {
        return html`
            <style>
                :host {
                    display: ${ this.showEstablishment ? "block" : "none" }
                }
            </style>
            <div id="qrModal" style="position:fixed;z-index: 2;display:${this.showQRScanner ? "block" : "none"}">
                <video id="qrScanner"></video>
            </div>
            <img id="code" alt="offer/answer" src=${this.codeSource}><br><br>
            ${!this.offerer && !this.answerer
                ? html`
                    <pre id="codeValue">${this.codeValue}</pre>
                    <button @click=${this.createOffer}>Generate Offer</button><br><br>
                    <button @click=${this.acceptOffer}>Scan QR</button><br><br>
                `
                : html``
            }
        `;
    }
    firstUpdated(changedProperties) {
        super.connectedCallback()
        // create/accept offer
        if (this.offerer) {
            this.createOffer();
        } else if (this.answerer) {
            this.acceptOffer();
        }
    }
    dispatchConnectionEvent = () => {
        this.showEstablishment = false;
        let event = new CustomEvent('connected', {
            detail: {
                dataChannel: this.dataChannel,
            }
        })
        this.dispatchEvent(event);
    }
    init = () => {
        this.candidateList = []
        this.peer = new RTCPeerConnection(iceConfiguration);
        console.log("PeerConnection created!!")
    
        this.peer.onicecandidate = e => {
            if (!e.candidate) {
                return !e.candidate
            } else {
                this.candidateList.push(e.candidate.toJSON())
                return console.log(JSON.stringify(e.candidate.toJSON()))
            }
        };
    
        this.peer.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            console.log("incoming dataChannel:", this.dataChannel)
            this.dispatchConnectionEvent();
        };
    
        this.gatherPromise = new Promise((resolve, reject) => {
            this.peer.onicegatheringstatechange = (event) => {
                if (this.peer.iceGatheringState === "complete") {
                    resolve(true);
                }
            }
        })
        this.peer.oniceconnectionstatechange = async (event) => {
            // TODO: revalidate reconnection logic
            console.log(this.peer.iceConnectionState)
            if (this.peer.iceConnectionState === "disconnected" && this.jsonLink) {
                this.offerer ? this.createOffer() : await this.acceptOffer()
            }
        }
    }

    createOffer = () => {
        this.offerer = true

        this.dataChannel = this.peer.createDataChannel("messenger", {ordered: true});
        this.dataChannel.addEventListener('open', () => {
            this.dispatchConnectionEvent()
        })

        this.peer.createOffer()
            .then(async (offer) => {
                offer = new RTCSessionDescription(offer);
                this.peer.setLocalDescription(offer);
                await Promise.race([this.gatherPromise, new Promise(resolve => setTimeout(resolve, 3000))]);
                console.log("OFFER_WITH_CANDIDATES:")
                // console.log(JSON.stringify([offer.toJSON(), candidateList]))
                this.jsonLink = this.jsonLink ? await this.jsonToUrl([offer.toJSON(), this.candidateList], this.jsonLink).then(() => this.jsonLink) : await this.jsonToUrl([offer.toJSON(), this.candidateList])
                console.log(this.jsonLink)
                let offerAndCandidates = btoa(JSON.stringify([offer.toJSON(), this.candidateList]))
                console.log(offerAndCandidates)
                this.showQR(this.jsonLink)
                let checkForAnswer = setInterval(async () => {
                    console.log("waiting for answer...")
                    let answer = await this.UrlToJson(this.jsonLink)
                    if (answer[0].type === "answer") {
                        this.acceptAnswer(btoa(JSON.stringify(answer)))
                        clearInterval(checkForAnswer)
                    }
                }, 4000)
            })
            .catch(console.log)
    }
    jsonToUrl = async (object, url) => {
        return fetch(url || "https://jsonstorage.net/api/items", {
            method: url ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(object),
            redirect: "follow",
        })
            .then(res => res.json())
            .then(res => res.uri)
    }
    UrlToJson = async (url) => {
        return fetch(url).then(res => res.json())
    }
    showQR = (data) => {
        this.codeSource = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${data}`
        this.codeValue = data
    }
    acceptOffer = async () => {
        this.jsonLink = this.jsonLink || await this.scanQR(); 
        let offerAndCandidates = await this.UrlToJson(this.jsonLink);
        console.log(offerAndCandidates)
        let offer = offerAndCandidates[0]
        this.candidateList = offerAndCandidates[1]
        
        offer = new RTCSessionDescription(offer)
        this.peer.setRemoteDescription(offer)
            .then(() => this.candidateList.forEach((candidate) => this.peer.addIceCandidate(new RTCIceCandidate(candidate))))
            .then(() => this.peer.createAnswer())
            .then(async (answer) => {
                answer = new RTCSessionDescription(answer);
                this.peer.setLocalDescription(answer)
                await this.gatherPromise;
                console.log("ANSWER_WITH_CANDIDATES:")
                // answerAndCandidates = btoa(JSON.stringify([answer.toJSON(), candidateList]))
                let answerAndCandidates = [answer.toJSON(), this.candidateList]
                console.log(answerAndCandidates)
                this.showQR(answerAndCandidates)
                await this.jsonToUrl(answerAndCandidates, this.jsonLink)
            })
            .catch(console.log)
    }

    acceptAnswer = (answerAndCandidates) => {
        let answer
        if (!answerAndCandidates) { answerAndCandidates = this.answer }
        [answer, this.candidateList] = JSON.parse(atob(answerAndCandidates))
        answer = new RTCSessionDescription(answer)
        this.peer.setRemoteDescription(answer)
            .then(() => this.candidateList.forEach((candidate) => this.peer.addIceCandidate(new RTCIceCandidate(candidate))))
            .catch(console.log)
    }

    scanQR = () => {
        this.showQRScanner = true;
        return new Promise((resolve, reject) => {
            let scanner = new Instascan.Scanner({ video: this.shadowRoot.getElementById('qrScanner'), mirror: true });
            scanner.addListener('scan', function (content) {
                console.log(content);
                scanner.stop();
                this.showQRScanner = false;
                resolve(content)
            });
            Instascan.Camera.getCameras().then(function (cameras) {
                if (cameras.length === 1) {
                    scanner.start(cameras[0])
                }
                else if (cameras.length > 0) {
                    scanner.start(cameras[1]);
                } else {
                    console.error('No cameras found.');
                }
            }).catch(function (e) {
                console.error(e);
            });
        })
    }
}
customElements.define('webrtc-connector', WebRTCConnector);