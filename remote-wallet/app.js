import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';
import "../common/webrtc-connector.js";
import "../common/webrtc-messenger.js";
import "./bitcoin-wallet.js";
import "./ethereum-wallet.js";
class RemoteWallet extends LitElement {
    static get properties() {
        return {
            dataChannelConnected: { type: Boolean },
        }
    }
    constructor(){
        super();
        this.dataChannelConnected = false;
        this.dataChannel = undefined;
    }
    render() {
        return html`
            <h2>Remote Wallet Demo (${this.dataChannelConnected ? "connected" : "scan with keychain"})</h2>
            <webrtc-connector
                .offerer=${true}
                @connected=${this.handleConnectionEvent}
            ></webrtc-connector>
            <!-- For demo purposes, we have messenger over webRTC -->
            ${this.dataChannelConnected && this.dataChannel
                ? html`
                    <bitcoin-wallet
                        .dataChannel=${this.dataChannel}
                    ></bitcoin-wallet>
                    
                    <ethereum-wallet
                        .dataChannel=${this.dataChannel}
                    ></ethereum-wallet>

                    <webrtc-messenger
                        .dataChannel=${this.dataChannel}
                    ></webrtc-messenger>
                    `
                : html``
            }
        `;
    }
    handleConnectionEvent = (event) => {
        this.dataChannelConnected = true;
        this.dataChannel = event.detail.dataChannel;
    }
}
customElements.define('remote-wallet', RemoteWallet);