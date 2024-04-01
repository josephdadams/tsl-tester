# tsl-tester
> A node.js script that sends TSL 3.1 protocol dummy data for testing.

## Installation
- Install Node.js and npm.
- Download this source code.
- In the terminal, within the `tsl-tester` folder, run `npm install` to install all project dependencies/libraries.
- Modify your `config.json` file before running, to configure the program properties.

## Configuration
Modify the included `config.json` file so that it matches the setup for your unique situation.

### Server Config
- `ip`: IP Address of the remote computer to send TSL data to
- `port`: The listening port of the remote computer
- `transport`: The transport method, either `udp` or `tcp`

### Address Config
An array of TSL Address and label information.

Each object should include:
- `address`: The address number to send.
- `label`: The label/name/mnemonic to send.

## Running the Program
You can simply run the program from the terminal: `node index.js`.

## License
tsl-tester was written by Joseph Adams and is distributed under the MIT License.

It is not sold, authorized, or associated with any other company or product.

To contact the author or for more information, please visit [www.techministry.blog](http://www.techministry.blog).