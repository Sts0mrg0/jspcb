# jspcb
Javascript library for parsing PCB file formats having rich metadata. 
Compatible with nodejs, jspcb can be used on the server or in the browser 
client in the context of automated pick-and-place (PnP). Supported PCB file
formats:

* <a href="file:///home/chronos/u-a7a1ed9f0b86bfc3924e4a621e22cffc1868821a/Downloads/eagle416r2_help_en.pdf">Eagle BRD (XML)</a>
* Gerber files (Altium/Protel extension semantics)

[See the wiki](https://github.com/firepick/jspcb/wiki)

### Install
To install **jspcb** command line wrapper and dependencies:

`npm install -g jspcb`

NOTE: The above requires that your user be able to write to /usr/local. 

### Command line
#### Generate SVG file from Eagle BRD
Convert XML Eagle BRD file such as the 
<a href="https://github.com/adafruit/Adafruit-PCB-Ruler/blob/master/Adafruit%20PCB%20Reference%20Ruler.brd">AdaFruit PCB ruler</a>
into its 
<a href="https://raw.githubusercontent.com/firepick/jspcb/master/eagle/ruler.svg">SVG equivalent</a>

`jspcb --eagle eagle/ruler.brd --svg /tmp/ruler.svg`

<a href="https://raw.githubusercontent.com/firepick/jspcb/master/doc/ruler.png">
    <img src="https://raw.githubusercontent.com/firepick/jspcb/master/doc/ruler.png" height="200px"></a>

#### Generate CSV file with SMD pads
To generate a CSV file of the SMD pads:

`jspcb --eagle eagle/ruler.brd --csv-smdpads /tmp/pads.csv`

#### Generate PCB matching template
Generate a FireSight and/or OpenCV PNG matching template from Gerber files using a 
**jspcb** [JSON configuration file](https://github.com/firepick/jspcb/blob/master/json/gerber-template.json):

`jspcb --json json/gerber-template.json`

<a href="https://raw.githubusercontent.com/firepick/jspcb/master/doc/ruler-tmplt.png"> 
    <img src="https://raw.githubusercontent.com/firepick/jspcb/master/doc/ruler-tmplt.png" height=200px></a>
<a href="https://raw.githubusercontent.com/firepick/jspcb/master/doc/ruler-match.png"> 
    <img src="https://raw.githubusercontent.com/firepick/jspcb/master/doc/ruler-match.png" height=200px></a>

