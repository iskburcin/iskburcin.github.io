document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis();
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => {
        lenis.raf(time * 750);
    });
    gsap.ticker.lagSmoothing(0)

    function splitTextIntoSpans(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
            const [firstDigit, secondDigit] = element.innerText;
            element.innerHTML = `<div class="digit-wrapper">
          <span class="first">${firstDigit}</span>
          <span class="second">${secondDigit}</span>
        </div>`;
        })
    }

    function populateGallery() {
        const imageContainers = document.querySelectorAll(".images");
        imageContainers.forEach(container => {
            for (let j = 0; j < imagesPerProject; j++) {
                if (imageIndex > totalImages) imageIndex = 1;
                const imgContainer = document.createElement("div")
                imgContainer.classList.add("img");

                const img = document.createElement("img");
                img.src = imagePath + `/img${imageIndex}.jpg`
                imgContainer.appendChild(img);
                container.appendChild(imgContainer)
                imageIndex++;
            }
        })
    }
    const bodyElement = document.body;
    const imagesPerProject = parseInt(bodyElement.getAttribute('data-images-per-project'), 10);
    const totalImages = parseInt(bodyElement.getAttribute('data-total-images'), 10);
    const imagePath = bodyElement.getAttribute('data-image-path');

    splitTextIntoSpans(".mask h1");
    // const imagesPerProject = 6;
    // const totalImages = 50;
    let imageIndex = 1;
    populateGallery();

    ScrollTrigger.create({
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
            gsap.set(".progress-bar", {
                scaleY: self.progress
            })
        }
    });

    const previewImg = document.querySelector(".preview-img img")
    const imgElements = document.querySelectorAll(".img img")
    imgElements.forEach((img) => {
        ScrollTrigger.create({
            trigger: img,
            start: "top 50%",
            end: "bottom 50%",
            onEnter: () => (previewImg.src = img.src),
            onEnterBack: () => (previewImg.src = img.src)
        });
    });

    const indicator = document.querySelector(".indicator")
    const indicatorStep = 18;
    const names = gsap.utils.toArray(".name");
    gsap.set(".indicator", {
        top: "0px"
    })

    const projects = gsap.utils.toArray(".city-view");
    projects.forEach((project, index) => {
        ScrollTrigger.create({
            trigger: project,
            start: "top 50%",
            end: "bottom 50%",
            onEnter: () => {
                gsap.to(indicator, {
                    top: index * indicatorStep + "px",
                    duration: 0.3,
                    ease: "power2.out",
                });
                names.forEach((name, i) => {
                    name.classList.toggle("active", i === index);
                })
            },
            onLeaveBack: () => {
                gsap.to(indicator, {
                    top: (index - 1) * indicatorStep + "px",
                    duration: 0.3,
                    ease: "power2.out"
                });
                names.forEach((name, i) => {
                    name.classList.toggle("active", i === index - 1);
                })
            }
        })
    });
    projects.forEach((project, i) => {
        const mask = project.querySelector(".mask");
        const digitWrapper = project.querySelector(".digit-wrapper");
        const firstDigit = project.querySelector(".first");
        const secondDigit = project.querySelector(".second");

        gsap.set([mask, digitWrapper, firstDigit, secondDigit], { y: 0 });
        gsap.set(mask, {
            position: "absolute",
            top: 0,
        });

        ScrollTrigger.create({
            trigger: project,
            start: "top bottom",
            end: "bottom top",
            anticipatePin: 1,
            fastScrollEnd: true,
            preventOverlaps: true,
            onUpdate: (self) => {
                const projectRect = project.getBoundingClientRect();
                const windowCenter = projects(i + 1);
                const velocityAdjustment = Math.min(scrollVelocity * 0.1, 100);
                const pushPoint = window.innerHeight * (0.85 + velocityAdjustment / window.innerHeight);

                if (projectRect.top <= windowCenter) {
                    if (!mask.isFixed) {
                        mask.isFixed = true;
                        gsap.set(mask, {
                            position: "fixed",
                            top: "50vh",
                        })
                    }

                    if (nextProject) {
                        const nextRect = nextProject.getBoundClientRect();

                        if (nextRect.top <= pushPoint && activeIndex !== i + 1) {
                            gsap.killTweensOf([mask, digitWrapper, firstDigit, secondDigit]);
                        }
                        activeIndex = i + 1;
                        gsap.to(mask, {
                            y: -80,
                            duration: 0.3,
                            ease: "powere2.out",
                            overwrite: true,
                        });
                        gsap.to(digitWrapper, {
                            y: -80,
                            duration: 0.5,
                            delay: 0.5,
                            ease: "powere2.out",
                            overwrite: true,
                        });
                        gsap.to(firstDigit, {
                            y: -80,
                            duration: 0.75,
                            ease: "powere2.out",
                            overwrite: true,
                        });
                        gsap.to(secondDigit, {
                            y: -80,
                            duration: 0.75,
                            delay: 0.1,
                            ease: "powere2.out",
                            overwrite: true,
                        });
                    }
                } else {
                    mask.isFixed = false;
                    gsap.set(mask, {
                        position: "absolute",
                        top: 0,
                    });
                }

                if (self.direction == -1 && projectRect.top > windowCenter) {
                    mask.isFixed = false;
                    gsap.set(mask, {
                        position: "absolute",
                        top: 0,
                    });

                    if (i > 0 && activeIndex == i) {
                        const prevProject = projects[i - 1];
                        if (prevProject) {
                            const prevMask = prevProject.querySelector(".mask");
                            const prevWrapper = prevProject.querySelector(".digit-wrapper");
                            const prevFirst = prevProject.querySelector(".first");
                            const prevSecond = prevProject.querySelector(".second");

                            gsap.killTweensOf([prevMask, prevWrapper, prevFirst, prevSecond]);

                            activeIndex = i - 1;
                            gsap.to([prevMask, prevWrapper], {
                                y: 0,
                                duration: 0.3,
                                ease: "powere2.out",
                                overwrite: true,
                            });
                            gsap.to(prevFirst, {
                                y: 0,
                                duration: 0.75,
                                ease: "powere2.out",
                                overwrite: true,
                            });
                            gsap.to(prevSecond, {
                                y: 0,
                                duration: 0.75,
                                delay: 0.1,
                                ease: "powere2.out",
                                overwrite: true,
                            });
                        }
                    }
                }

            },
            onEnter: () => {
                if (i === 0) activeIndex = 0;
            }
        })
    })
    let activeIndex = -1;
    let lastScrollTop = 0;
    let scrollVelocity = 0;

    window.addEventListener("scroll", () => {
        const st = window.pageYOffset;
        scrollVelocity = Math.abs(st - lastScrollTop);
        lastScrollTop = st;
    },
        {
            passive: true,
        }
    );
});
