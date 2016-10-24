(function()
{
  'use strict'

  const raf = requestAnimationFrame
  let stop_raf = false

  // <audio> settings
  const audio = document.querySelector('audio')
  audio.currentTime = 2.255 // convenient moment to start playing the song

  // Score section
  const $score = document.querySelector('.score')

  // Init green zone
  const zone = document.querySelector('#zone')
  const zCtx = zone.getContext('2d')

  const TOP_LIMIT = 500
  const BOTTOM_LIMIT = 400

  // Init music track
  const track = document.querySelector('#track')
  const ctx = track.getContext('2d')
  ctx.strokeStyle = '#ddd'
  const HEIGHT = 600
  const WIDTH = 400

  // Guerilla Radio's bpm – 104
  // 4 beats per bar
  // 104 -> 60000
  // time to move 4 beats from bottom to top
  // 4 -> (60000 / 104) * 4 // ~2307
  const bpm = 104
  const time = (60000 / bpm) * 4
  const frameTime = 16.695 // average frame drawing time in my browser
  // 2307 / 16.66 fps = ~138 <- number of frames from bottom to top
  const frames = time / frameTime
  const step = 600 / frames; // position increment per frame
  const beatHeight = 600 / 4
  let y = 0
  let score = 0
  let currentBeat = -14
  // let currentBeat = 0
  let coords = []
  let pressedBeats = []
  let currentBeatCoord, activeLine, then, offset = 0

  /*
    Codes mapping:
    0 – x
    1 – ○
    2 – □
    3 – △
    L – ←
    U – ↑
    R – →
    D – ↓
  */
  const arrowHeadLength = 15   // length of head in pixels
  const L = 14, R = 15, U = 12, D = 13

  const buttonDrawingsMap = {
    0: function (x, y) {
      ctx.strokeStyle = '#A0B6DB'
      ctx.beginPath()
      ctx.moveTo(x-10, y-10)
      ctx.lineTo(x+10, y+10)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x+10, y-10)
      ctx.lineTo(x-10, y+10)
      ctx.stroke()
    },
    1: function (x, y) {
      ctx.strokeStyle = '#EB7A7C'
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(x, y, 10, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()
    },
    2: function (x, y) {
      ctx.strokeStyle = '#D692BF'
      ctx.clearRect(x-10, y-10, 20, 20)
      ctx.strokeRect(x-10, y-10, 20, 20)
    },
    3: function (x, y) {
      ctx.strokeStyle = '#53B8B3'
      ctx.beginPath()
      ctx.moveTo(x, y+10)
      ctx.lineTo(x+10, y-10)
      ctx.lineTo(x-10, y-10)
      ctx.closePath()
      ctx.stroke()
    },
    [L]: function (x, y) {
        ctx.strokeStyle = '#000'
        ctx.beginPath()
        let angle = Math.atan2(0, 0)
        ctx.moveTo(x+15, y)
        ctx.lineTo(x-10, y)
        ctx.moveTo(x-15, y)
        ctx.lineTo(x-15+arrowHeadLength*Math.cos(angle-Math.PI/6),y-arrowHeadLength*Math.sin(angle-Math.PI/6))
        ctx.moveTo(x-15, y)
        ctx.lineTo(x-15+arrowHeadLength*Math.cos(angle+Math.PI/6),y-arrowHeadLength*Math.sin(angle+Math.PI/6))
        ctx.stroke()
    },
    [R]: function (x, y) {
        ctx.strokeStyle = '#000'
        ctx.beginPath()
        let angle = Math.atan2(0, 0)
        ctx.moveTo(x-15, y)
        ctx.lineTo(x+10, y)
        ctx.moveTo(x+15, y)
        ctx.lineTo(x+15-arrowHeadLength*Math.cos(angle-Math.PI/6),y+arrowHeadLength*Math.sin(angle-Math.PI/6))
        ctx.moveTo(x+15, y)
        ctx.lineTo(x+15-arrowHeadLength*Math.cos(angle+Math.PI/6),y+arrowHeadLength*Math.sin(angle+Math.PI/6))
        ctx.stroke()
    },
    [U]: function (x, y) {
        ctx.strokeStyle = '#000'
        ctx.beginPath()
        let angle = Math.atan2(20, 0)
        ctx.moveTo(x, y-15)
        ctx.lineTo(x, y+15)
        ctx.moveTo(x, y+15)
        ctx.lineTo(x-arrowHeadLength*Math.cos(angle-Math.PI/6),y-arrowHeadLength/6*Math.sin(angle-Math.PI/6))
        ctx.moveTo(x, y+15)
        ctx.lineTo(x-arrowHeadLength*Math.cos(angle+Math.PI/6),y-arrowHeadLength/6*Math.sin(angle+Math.PI/6))
        ctx.stroke()
    },
    [D]: function (x, y) {
        ctx.strokeStyle = '#000'
        ctx.beginPath()
        let angle = Math.atan2(30, 0)
        ctx.moveTo(x, y+15)
        ctx.lineTo(x, y-15)
        ctx.moveTo(x, y-15)
        ctx.lineTo(x-arrowHeadLength*Math.cos(angle-Math.PI/6),y+arrowHeadLength/6*Math.sin(angle-Math.PI/6))
        ctx.moveTo(x, y-15)
        ctx.lineTo(x-arrowHeadLength*Math.cos(angle+Math.PI/6),y+arrowHeadLength/6*Math.sin(angle+Math.PI/6))
        ctx.stroke()
    },
  }

  // Random for tests
  // const b = [0, 1, 2, 3, L, R, U, D]
  // const config = Array.from(Array(80)).reduce((acc, _, i) => {
  //   acc[i * 4] = [ b[Math.floor(Math.random() * 8)] ]
  //   return acc
  // }, {})

  const config = {
    // intro
    0: [ 0 ],
    4: [ 1 ],
    8: [ 2 ],
    12: [ 3 ],
    16: [ 0 ],
    20: [ 1 ],
    24: [ 2 ],
    28: [ 3 ],
    // first breakdown
    32: [ L, 1 ],
    33: [ L, 1 ],
    34: [ R, 2 ],
    35: [ R, 2 ],
    36: [ L, 3 ],
    37: [ R, 1 ],
    38: [ L, 3 ],
    39: [ R, 1 ],
    32: [ L, 1 ],
    33: [ L, 1 ],
    34: [ R, 2 ],
    35: [ R, 2 ],
    36: [ L, 3 ],
    37: [ R, 1 ],
    38: [ L, 3 ],
    39: [ R, 1 ],
    40: [ D, 0 ],
    41: [ D, 0 ],
    42: [ U, 3 ],
    43: [ U, 3 ],
    44: [ D, 3 ],
    45: [ D, 3 ],
    46: [ U, 0 ],
    47: [ U, 0 ],
    48: [ 0, 1 ],
    49: [ 0, 1 ],
    50: [ 2, 3 ],
    51: [ 2, 3 ],
    52: [ D, 0 ],
    53: [ L, 2 ],
    54: [ U, 3 ],
    55: [ R, 1 ],
    56: [ D, 0 ],
    57: [ L, 2 ],
    58: [ U, 3 ],
    59: [ R, 1 ],
    60: [ D ],
    61: [ 0 ],
    62: [ U ],
    63: [ 3 ],
  }

  function drawFrame(now) {
    if (stop_raf) return

    raf(drawFrame)
    // adjust for lag
    if (now - then > frameTime) {
      offset = ((now - then - frameTime) / frameTime) * step
      y += offset
    }
    then = now
    drawLines()
  }

  function drawLines() {
    ctx.clearRect(0,0,WIDTH,HEIGHT);

    if (y >= HEIGHT) {
      y = y % HEIGHT
      currentBeat += 4
    }

    for (let i = 0; i < 8; i++) {
      // calculate Y coord for every line
      let coordY = Math.round(y + beatHeight * (-4 + i))

      // define object to describe the line
      // y - vertical coord on track
      // beat - what beat in song it corresponds to
      coords[i] = {
        y: coordY,
        beat: 4 - i + currentBeat, // i[4] - currentBeat
      }
    }

    // Find line that we should be following
    // if line already passed green zone, start following next line
    const lineAfterGreenZone = coords.find(({ y }) => y > TOP_LIMIT)
    const nextIndex = coords.indexOf(lineAfterGreenZone) - 1
    const nextActiveLine = coords[nextIndex]
    if (nextActiveLine && activeLine !== nextActiveLine) {
      activeLine = nextActiveLine
      activeLine.index = nextIndex
    }

    currentBeatCoord = coords[4].y % HEIGHT

    coords
    .forEach(({ y, beat }, i) => {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(WIDTH, y)
      ctx.stroke()
      if (beat in config) {
        let codes = config[beat]
        drawButtonOnCanvas(codes, 200, y)
      }
    })

    y += step
  }

  function drawGreenZone() {
    zCtx.fillStyle = "rgba(0, 255, 0, 0.3)"
    zCtx.fillRect(0, BOTTOM_LIMIT, WIDTH, TOP_LIMIT - BOTTOM_LIMIT)
    zCtx.fillRect(0, 435, WIDTH, 30)
  }

  function drawButtonOnCanvas(buttonCodes, coordX, coordY) {
    ctx.save()
    ctx.lineWidth = 5
    for (let i = 0, n = buttonCodes.length; i < n; i++) {
      let btnCoordX = 200 - 25 * (n - 1) + 50 * i;
      buttonDrawingsMap[buttonCodes[i]](btnCoordX, coordY)
    }
    ctx.restore()
  }

  // TODO: CHECK CODES
  function checkPressedButtons() {
    if (!activeLine) return;
    const { beat, y } = activeLine
    if (!pressedBeats.includes(beat) && beat in config) {
      const codes = config[beat]
      const pressed = getPressed()

      if (codes.every((code) => pressed.includes(code))) {
        pressedBeats.push(beat)
        if (y >= BOTTOM_LIMIT && y <= TOP_LIMIT) {
          if (y >= 435 && y <= 465) {
            score += 20
          } else score += 10
          $score.textContent = score
        }
      }
    }
    if (beat == 63) fadeAudio()
  }

  function getPressed() {
    const GP = navigator.getGamepads()[0]

    if (!GP) return []

    return GP.buttons.reduce((acc, btn, i) =>
      btn.pressed ? [ ...acc, i ] : acc
    , [])
  }

  function fadeAudio() {
    let volume = 1, interval

    interval = setInterval(() => {
      if (volume < 0)  {
        clearInterval(interval)
        stop_raf = true
      }

      volume = audio.volume - 0.1
      audio.volume = volume < 0 ? 0 : volume
    }, 500)
  }

  // Initialization
  function start(e) {
    if (e.code == 'Space') {
      document.body.removeEventListener('keydown', start);
      drawGreenZone()
      setInterval(() => {
        checkPressedButtons()
      }, 100)

      const $scoreBoard = document.querySelector('.score-board')
      $scoreBoard.classList.add('initialized')
      drawFrame()
      audio.play()
      then = performance.now()
    }
  }

  document.body.addEventListener('keydown', start)

})()