var fs = require('fs');
var EagleBRD = require("./eaglebrd");
var Gerber = require("./gerber");
var PcbSvgFactory = require("./pcbsvg");

(function(exports) {
    function PcbTransform(options) {
        var that = this;

        options = options || {};
        that.verbose = options.verbose || false;
        that.writer = options.writer || console;

        return that;
    }

    PcbTransform.prototype.log = function() {
        var that = this;
        that.writer.log.apply(that.writer, arguments);
    }
    PcbTransform.prototype.version = function() {
        var pkg = JSON.parse(fs.readFileSync(__dirname + '/../package.json'));
        return pkg && pkg.version ? pkg.version : 'unknown';
    }

    PcbTransform.prototype.eagleBrdToSvg = function(brd, smds, holes, options) {
        var that = this;
        var bounds = brd.bounds;
        var width = bounds.r - bounds.l;
        var height = bounds.b - bounds.t;
        var layerNumber = brd.getLayerNumber(options.layer);
        var layerPad = brd.isBottomLayer(layerNumber) ? "16" : "1";
        var layerSilk = brd.isBottomLayer(layerNumber) ? "22" : "21";

        new PcbSvgFactory(that.options).create({
            dimWires: brd.pcbWires("Dimension"),
            bounds: bounds,
            smds: smds,
            holes: holes,
            texts: brd.pcbText(layerSilk),
            writer: that.writer,
        });
    }
    PcbTransform.prototype.readEagleBrd = function(path) {
        var that = this;
        data = fs.readFileSync(path);
        that.eagleBrd = new EagleBRD(data.toString());
    }
    PcbTransform.prototype.readGerber = function(layerFiles) {
        var that = this;
        var layerKeys = Object.keys(layerFiles);
        var grb = that.gerber = new Gerber();
        for (var iLayer=0; iLayer<layerKeys.length; iLayer++)  {
            var key = layerKeys[iLayer];
            var id = key.toUpperCase();
            var path = layerFiles[key];
            that.verbose && that.log("loading Gerber", id, "file:"+path);
            var data = fs.readFileSync(path);
            that.verbose && that.log("processGerber() id:"+id, "path:"+path);
            var layer = grb.parseLayer(id, data);
            that.verbose && that.log("graphics:" + (layer.graphics.length));
        }
    }
    PcbTransform.prototype.pcbPads = function(layerSpec) {
        var that = this;
        var pcb = that.eagleBrd || that.gerber;
        return pcb && pcb.pcbPads(layerSpec) || [];
    }
    PcbTransform.prototype.pcbWires = function(layerSpec) {
        var that = this;
        var pcb = that.eagleBrd || that.gerber;
        return pcb && pcb.pcbWires(layerSpec) || [];
    }
    PcbTransform.prototype.writeCsv = function(csvWriters) {
        var that = this;
        var pcb = that.eagleBrd || that.gerber;
        csvWriters = csvWriters || {smdpads: that.writer};

        if (csvWriters.smdpads) {
            var writer = csvWriters.smdpads;
            var smds = pcb.pcbPads();
            writer.log("#,ELEMENT,PACKAGE,PAD,X,Y,W,H,ANGLE,ROUNDNESS");
            for (var iSMD = 0; iSMD < smds.length; iSMD++) {
                var smd = smds[iSMD];
                writer.log( iSMD+1+","+
                    (smd.element||"")+","+
                    (smd.package||"")+","+
                    (smd.name||"")+", "+
                    smd.x+", "+
                    smd.y+", "+
                    smd.width+", "+
                    smd.height+", "+
                    (smd.angle||0)+", "+
                    (smd.roundness||0)+
                    "");
            }
        }
        if (csvWriters.holes) {
            var writer = csvWriters.holes;
            var holes = pcb.pcbHoles();
            writer.log("#,ELEMENT,PACKAGE,HOLE,X,Y,DRILL");
            for (var iHole = 0; iHole < holes.length; iHole++) {
                var hole = holes[iHole];
                writer.log( iHole+1+","+
                    (hole.element||"")+","+
                    (hole.package||"")+","+
                    (hole.name||"")+", "+
                    hole.x+", "+
                    hole.y+", "+
                    hole.r*2+
                    "");
            }
        }
    }
    PcbTransform.prototype.writeSvg = function(options) {
        var that = this;
        options = options || {};
        var layers = options.layers || {Top:true};
        var writer = options.writer || that.writer;
        var pcb = that.eagleBrd || that.gerber;
        if (pcb == null) {
            throw new Error("SVG creation failed. No PCB files have been specified.");
        }
        if (that.gerber) {
            new PcbSvgFactory().create({
                writer: writer,
                smds: pcb.pcbPads(),
                dimWires: pcb.pcbWires("GKO"),
            });
        } else if (that.eagleBrd) {
            var brd = that.eagleBrd;
            that.eagleBrdToSvg(brd, 
               options.showSmds ? brd.pcbPads(options.layer) : [],
               brd.pcbHoles(), {
                   layers: layers,
               });
        }
    }

    module.exports = exports.PcbTransform = PcbTransform;
})(typeof exports === "object" ? exports : (exports = {}));

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("PcbTransform", function() {
    var should = require("should");
    var StringLog = require("./stringlog");
    var PcbTransform = exports.PcbTransform; // require("./PcbTransform");

    it("PcbTransform(options) creates a PCB data transformer", function() {
        var slog = new StringLog();
        var pcb = new PcbTransform({
            verbose: true,
            writer: slog,
        });
        pcb.verbose.should.equal(true);
        pcb.writer.should.equal(slog);
    })
    it("version() returns package.json version", function() {
        var pcb = new PcbTransform({verbose: false});
        pcb.version().should.equal("0.0.5");
    })
    it("readEagleBrd(path) reads Eagle BRD file ", function() {
        var pcb = new PcbTransform({verbose: false});
        pcb.readEagleBrd("../eagle/test.brd");
        var pads = pcb.pcbPads();
        pads.length.should.equal(4);
    });
    it("readGerber(layerFiles) reads Gerber files ", function() {
        var pcb = new PcbTransform({verbose: false});
        pcb.readGerber({
            GKO: "../gerber/ruler/Ruler.GKO",
            GTP: "../gerber/ruler/Ruler.GTP",
        });
        var pads = pcb.pcbPads();
        pads.length.should.equal(166);
    });
    it("writeSvg() writes SVG files for EagleBRD", function() {
        var slog = new StringLog();
        var pcb = new PcbTransform({
            verbose: false,
            writer: slog,
        });
        pcb.readEagleBrd("../eagle/test.brd");
        pcb.writeSvg({
            writer: slog,
            layers: {
                Top:true,
            },
        });
        var svgLines = slog.output.trim().split("\n");
        svgLines.length.should.equal(17);
        svgLines[0].should.equal('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>');
        svgLines[1].should.equal('<svg xmlns="http://www.w3.org/2000/svg" version="1.1" '+ 
            'width="154.94mm" height="25.4mm" viewbox=" 0 -25.4 154.94 25.4 " >');
        svgLines[2].should.equal('<g stroke-linecap="round" stroke-width="0.25">');
        svgLines[3].should.equal('<rect x="0" y="0" width="154.94" height="25.4" '+
            'transform="scale(1,-1)" fill="#ddf"/><!--dimension-->');
        svgLines[4].should.equal('<line x1="0" y1="0" x2="0" y2="-25.4" width="0.5" stroke="#f0f"/><!--dimension-->');
    });
    it("writeCsv(csvWriters) writes CSV for EagleBRD", function() {
        var smdpads = new StringLog();
        var holes = new StringLog();
        var pcb = new PcbTransform();
        pcb.readEagleBrd("../eagle/test.brd");
        pcb.writeCsv({
            smdpads: smdpads,
            holes: holes,
        });
        var outPads = smdpads.output.trim().split("\n");
        outPads.length.should.equal(5);
        outPads[0].should.equal('#,ELEMENT,PACKAGE,PAD,X,Y,W,H,ANGLE,ROUNDNESS');
        outPads[1].should.equal('1,E$16,0201,P$1, 19.05, 10.764800000000001, 0.3, 0.3, 90, 0');
        outPads[2].should.equal('2,E$16,0201,P$2, 19.05, 10.1648, 0.3, 0.3, 90, 0');
        outPads[3].should.equal('3,E$23,0402,1, 20.574, 10.66, 0.5, 0.6, 90, 0');
        outPads[4].should.equal('4,E$23,0402,2, 20.574, 9.66, 0.5, 0.6, 180, 0');

        var outHoles = holes.output.trim().split("\n");
        outHoles.length.should.equal(2);
        outHoles[0].should.equal('#,ELEMENT,PACKAGE,HOLE,X,Y,DRILL');
        outHoles[1].should.equal('1,E$46,ALL-HOLES,, 152.2235, 17.674, 3.26');
    });
    it("writeCsv(csvWriters) writes CSV for Gerber files", function() {
        var csvPads = new StringLog();
        var csvHoles = new StringLog();
        var pcb = new PcbTransform();
        pcb.readGerber({
            GKO: "../gerber/ruler/Ruler.GKO",
            GTP: "../gerber/ruler/Ruler.GTP",
            GTS: "../gerber/ruler/Ruler.GTS",
        });
        pcb.writeCsv({
            smdpads: csvPads,
            holes: csvHoles,
        });
        var padLines = csvPads.output.trim().split("\n");
        padLines.length.should.equal(167);
        padLines[0].should.equal('#,ELEMENT,PACKAGE,PAD,X,Y,W,H,ANGLE,ROUNDNESS');
        padLines[1].should.equal('1,,,D10, 44.449999999999996, 35.564826, 0.3048, 0.3048, 0, 0');

        var holeLines = csvHoles.output.trim().split("\n");
        holeLines.length.should.equal(22);
        holeLines[0].should.equal('#,ELEMENT,PACKAGE,HOLE,X,Y,DRILL');
        holeLines[1].should.equal('1,,,D61, 161.23919999999998, 43.789092, 2.0574');
        holeLines[21].should.equal('21,,,D366, 137.668, 44.501562, 0.6096');
    });
})
