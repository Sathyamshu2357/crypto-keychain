import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';
import "../common/webrtc-connector.js";
import "../common/webrtc-messenger.js";
import "./crypto-keychain.js";
class LocalKeychain extends LitElement {
    static get properties() { 
        return {
            dataChannelConnected: { type: Boolean },
            scanForConnection: { type: Boolean },
        };
      }
    constructor() {
        super()
        this.scanForConnection = false;
        this.dataChannelConnected = false;
        this.dataChannel = undefined;
    }
    render() {
        return html`
            ${this.scanForConnection
                ? html`
                    <webrtc-connector
                        .answerer=${true}
                        @connected=${this.handleConnectionEvent}
                    ></webrtc-connector>
                `
                : html``
            }
            ${this.dataChannelConnected ? html`` : html`<button @click=${() => this.scanForConnection = !this.scanForConnection}>Scan QR</button>`}
            <!-- For demo purposes, we have messenger over webRTC -->
            ${this.dataChannelConnected && this.dataChannel
                ? html`
                    <crypto-keychain
                        .dataChannel=${this.dataChannel}
                    ></crypto-keychain>

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
    handleStartScanning = () => {

    }
}

customElements.define('local-keychain', LocalKeychain);