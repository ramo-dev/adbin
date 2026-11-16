// Command genicons renders the PWA icons. Run from the repo root:
//
//	go run ./cmd/genicons
package main

import (
	"fmt"
	"image"
	"image/color"
	"image/png"
	"os"
)

func main() {
	if err := os.MkdirAll("web/public", 0o755); err != nil {
		panic(err)
	}
	for _, size := range []int{192, 512} {
		img := image.NewRGBA(image.Rect(0, 0, size, size))
		bg := color.RGBA{11, 11, 15, 255}
		red := color.RGBA{229, 72, 77, 255}
		white := color.RGBA{255, 255, 255, 255}

		cx, cy := float64(size)/2, float64(size)/2
		radius := float64(size) * 0.36

		for y := 0; y < size; y++ {
			for x := 0; x < size; x++ {
				img.Set(x, y, bg)
				dx, dy := float64(x)+0.5-cx, float64(y)+0.5-cy
				if dx*dx+dy*dy <= radius*radius {
					img.Set(x, y, red)
				}
			}
		}

		ax, ay := cx-float64(size)*0.10, cy-float64(size)*0.14
		bx, by := cx-float64(size)*0.10, cy+float64(size)*0.14
		tx, ty := cx+float64(size)*0.17, cy

		for y := 0; y < size; y++ {
			for x := 0; x < size; x++ {
				if pointInTriangle(float64(x)+0.5, float64(y)+0.5, ax, ay, bx, by, tx, ty) {
					img.Set(x, y, white)
				}
			}
		}

		f, err := os.Create(fmt.Sprintf("web/public/icon-%d.png", size))
		if err != nil {
			panic(err)
		}
		if err := png.Encode(f, img); err != nil {
			panic(err)
		}
		f.Close()
		fmt.Println("wrote", f.Name())
	}
}

func pointInTriangle(px, py, ax, ay, bx, by, cx, cy float64) bool {
	d1 := edge(px, py, ax, ay, bx, by)
	d2 := edge(px, py, bx, by, cx, cy)
	d3 := edge(px, py, cx, cy, ax, ay)
	hasNeg := d1 < 0 || d2 < 0 || d3 < 0
	hasPos := d1 > 0 || d2 > 0 || d3 > 0
	return !(hasNeg && hasPos)
}

func edge(px, py, ax, ay, bx, by float64) float64 {
	return (px-bx)*(ay-by) - (ax-bx)*(py-by)
}
