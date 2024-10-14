klv = require('klv');
udp = require('dgram')


misbLocalSetId = Buffer.from('060E2B34020B01010E01030101000000', 'hex')


// Create an RTP packet Can be optimised a LOT
function makeRTP(ssrc, seqno, timestamp, payload) {

   const packet = Buffer.alloc(12 + payload.length)

   packet[0x00] = 0x80; 	// Version 2, No padding, No extension, No CSRC
   packet[0x01] = 0x80 | 96;	// Type 96 payload, marker bit set

   packet.writeUInt16BE(seqno, 2)
   packet.writeUInt32BE(timestamp, 4)
   packet.writeUInt32BE(ssrc, 8)

   payload.copy(packet, 12, 0); 

   return packet;
}


// Return a KLV encoded timestamp component (0x02)
function getPrecisionTime(timeStamp) {
  const precisionTime = Buffer.alloc(8);
  precisionTime.writeBigInt64BE(timeStamp, 0);

  klvPrecisionTimeStamp = klv.encodeKLV([0x02], precisionTime)

  return klvPrecisionTimeStamp
}




// Return a blank (invalid) KLV encoded checksum component (0x01)
function getBlankChecksum() {
  klvEmptyChecksum = klv.encodeKLV([0x01], [0x00, 0x00])

  return klvEmptyChecksum
}

// Given a KLV data buffer, calculate the checksum of the data
function getChecksum(payload) {
  // Calculate checksum, ignoring last 2 bytes (checksum)
  var sum = 0;
  for (var i = 0; i < payload.length-2; i++) {
    sum += payload[i] << (8 * ((i + 1) % 2));
  }

  return (sum & 0xFFFF) // Last 16 bits
}


function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}



port=5004
rtpsock = udp.createSocket('udp4');

seqno=0;

ssrc = getRandomInt(99999999)

console.log('ssrc: '+ ssrc.toString())


function sendData() {

  // Current epoch time in ms
  const timeNow = Date.now()

  var items=[getPrecisionTime(BigInt(timeNow) * BigInt(1000))]


  // Add an empty checksum
  items.push(getBlankChecksum())

  payload = Buffer.concat(items)

  outputKlv = klv.encodeKLV(misbLocalSetId, payload)

  // Calculate & Update checksum
  crc = getChecksum(outputKlv)
  outputKlv.writeUInt16BE(crc, outputKlv.length-2)

  //  console.log(outputKlv.toString('hex'));

  // Use timestamp and base on 90Khz timer
  timestamp = BigInt(timeNow * 90);
  packet = makeRTP(ssrc, seqno, Number(BigInt.asUintN(32, timestamp)) , outputKlv)

  // Wrap sequence no - it is 16 bits
  seqno++;
  if (seqno>65535) seqno=0;


  rtpsock.send(packet, 0, packet.length, port, '127.0.0.1');
}

console.log('Starting send on interval')

// Every 200ms
intvl = setInterval(sendData, 200);

