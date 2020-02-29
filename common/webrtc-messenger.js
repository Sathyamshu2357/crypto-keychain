import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';
class Messenger extends LitElement {
    static get properties() {
        return {
            dataChannel: { type: RTCDataChannel },
            msg: { type: String },
            log: { type: String },
        }
    }
    constructor() {
        super()
        this.msg = "";
        this.log = "";        
    }
    render() {
        if (this.dataChannel !== undefined) {
            this.dataChannel.addEventListener('message', this.handleMsgEvent);
            this.dataChannel.addEventListener('open', () => console.log("dataChannel Opened"));
            this.dataChannel.addEventListener('close', () => console.log("dataChannel Closed"));
        }
        return html`
            <h4>MessengerChannel: ${this.dataChannel ? this.dataChannel.label : ""}</h4>
            ===========
            <br>
            <form id="msgForm" @submit=${(event) => {event.preventDefault(); this.sendMsg()}}>
                <input id="msg" type="text" .value=${this.msg} @change=${(e) => this.msg = e.target.value}>
            </form>
            <button type="submit" form="msgForm">Send</button>
            <br>
            <pre id="log">${this.log}</pre>
        `;
    } 
    sendMsg = () => {
        this.dataChannel.send(this.msg);
        this.log += `\nme:> ${this.msg}`;
        this.msg = "";
    }
    handleMsgEvent = (event) => {
        console.log("received on dataChannel:", event.data)
        this.log = this.log + `\n> ${event.data}`
    }
}
customElements.define('webrtc-messenger', Messenger);