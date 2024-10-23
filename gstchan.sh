

# Start up a suitably patched GStreamer to send a 1Mbit video stream to target using RIST on port 5000
# Expects to receive KLV via RTP on port 5004

export TARGETIP=127.0.0.1


# Note timecode-offset to remove BST

gst-launch-1.0 \
    mpegtsmux name=mux ! queue ! rtpmp2tpay ! ristsink  address=${TARGETIP} port=5000 \
    udpsrc caps='application/x-rtp, media=(string)application, clock-rate=(int)90000, encoding-name=(string)SMPTE336M' ! queue !rtpklvdepay ! meta/x-klv, parsed=true, sync=true ! identity sync=true ! mux. \
    videotestsrc is-live=1 pattern=smpte \
    ! timecodestamper source="rtc" timecode-offset=-180000  \
    ! textoverlay text="GStreamer Sync KLV" font-desc="Sans 24" \
    ! timeoverlay halignment=left valignment=top    text="Timecode:" shaded-background=true font-desc="Sans, 24"  time-mode="time-code"\
    ! videoconvert ! videorate ! video/x-raw, width=640,height=360, framerate=50/1 \
    ! x264enc insert-vui=true option-string="pic-struct" speed-preset="ultrafast" bitrate=1024 ! 'video/x-h264,profile=high' ! h264parse update-timecode=true ! mux.
