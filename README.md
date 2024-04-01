# gpio-to-tsl
> A node.js script that converts GPIO signals to TSL UMD 3.1, to read tally states from your video switcher or device that lacks networking capabilities, and sends them to your Tally Service using the TSL 3.1 protocol. 

## Installation
- Install Node.js and npm on your Raspberry Pi device.
- Download this source code to your Pi.
- In the terminal, within the `gpio-to-tsl` folder, run `npm install` to install all project dependencies/libraries.
- Modify your `config.json` file before running, to configure the program properties.

## Configuration
Modify the included `config.json` file so that it matches the setup for your unique situation

### Server Config
- `ip`: IP Address of the remote computer to send TSL data to
- `port`: The listening port of the remote computer
- `transport`: The transport method, either `udp` or `tcp`
- `constantupdates`: Whether or not TSL 3.1 data should be sent every second or not. Can be `true` or `false`. Some tally systems require the data to be constantly sent, others do not.
- `resistor`: Whether the internal pull-up resistors on the Pi should be set or not. Can be `up`, `down`, or `none`.
- `debounce`: Amount of time in microseconds to be used to signify a state change on the pins. Default of `15000` microseconds, which is 15 milliseconds.

### Address/Pin Config
An array of TSL Address, label, and pin information.

Each object should include:
- `address`: The address number to send.
- `label`: The label/name/mnemonic to send.
- `pvw_pin`: The GPIO pin number to use for the Preview pin, for this address. Set to `0` if you don't want to track a Preview state for this address.
- `pgm_pin`: The GPIO pin number to use for the Program pin, for this address. Set to `0` if you don't want to track a Program state for this address.
- `current_pvw_state`: Default/startup value for this address's preview value. Can be `0` or `1`.
- `current_pgm_state`: Default/startup value for this address's program value. Can be `0` or `1`.
- `inverted`: Whether or not to invert the value received from the pin. If your switcher is sending a `false` state when it should be `true`, you can set this property to `true` to flip the value. Otherwise just leave it set to `false`.

## GPIO Wiring
You should wire the pins from the GPO output of your switcher to the GPI pins on your Pi according to how you have it configured in your config file for that Address. All of the ground pins should connect together. When your switcher puts that particular Address/Camera/Device to that bus, it generally puts that pin to ground, and this is what the script detects.

## Running the Program
You can simply run the program from the terminal: `sudo node index.js`. The program needs elevated permissions to access and control the GPIO pins of the Pi.

You can also daemonize the program as a service by using the `pm2` library.
1. Install `pm2`: `npm install -g pm2`
1. After pm2 is installed, type `sudo pm2 start index.js --name gpio-to-tsl`.
1. If you would like it to start automatically upon bootup, type `sudo pm2 startup` and follow the instructions on-screen.
1. To view the console output while running the software with `pm2`, type `sudo pm2 logs gpio-to-tsl`.

## License
GPIO to TSL was written by Joseph Adams and is distributed under the MIT License.

It is not sold, authorized, or associated with any other company or product.

To contact the author or for more information, please visit [www.techministry.blog](http://www.techministry.blog).