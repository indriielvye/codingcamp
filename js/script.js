/* =========================================================
   My Dashboard - Vanilla JS
   Features: Greeting, Focus Timer, To-Do List, Quick Links
   Storage: Browser Local Storage
   ========================================================= */

(function () {
    "use strict";

    /* =====================================================
       1. Greeting — current time, date & time-of-day greeting
       ===================================================== */
    const greetingEl = document.getElementById("greeting");
    const timeEl = document.getElementById("current-time");
    const dateEl = document.getElementById("current-date");

    // Name control refs (Requirement 1.1) — input + Save button live in index.html.
    const nameInputEl = document.getElementById("name-input");
    const nameSaveBtn = document.getElementById("name-save");

    const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const MONTHS = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    function pad(n) {
        return n < 10 ? "0" + n : "" + n;
    }

    /* --- Pure greeting logic (DOM-free, storage-free) ---
       Independently testable: the greeting string is produced from
       (hours, name) with no access to the DOM or Local Storage.
       Requirement 1.3: absent name -> generic "<Time-of-Day>!"
       Requirement 1.4: present name -> "<Time-of-Day>, <name>!"
       Requirement 1.5: empty/whitespace name is treated as absent. */
    function isNameAbsent(name) {
        return name == null || String(name).trim() === "";
    }

    function timeOfDay(hours) {
        if (hours < 12) return "Good morning";
        if (hours < 18) return "Good afternoon";
        return "Good evening";
    }

    function buildGreeting(hours, name) {
        const base = timeOfDay(hours);
        return isNameAbsent(name)
            ? base + "!"
            : base + ", " + String(name).trim() + "!";
    }

    /* --- Name persistence (Local Storage) ---
       Mirrors the existing load/save pattern used by To-Do and Links.
       Requirement 1.2: name stored under "dashboard_name".
       Requirement 1.5: empty/whitespace name clears the key (removeItem),
                        never stored as an empty string. */
    const NAME_KEY = "dashboard_name";

    // Returns "" when the key is absent or storage is unavailable.
    function loadName() {
        try {
            return localStorage.getItem(NAME_KEY) || "";
        } catch (e) {
            return "";
        }
    }

    // Trims raw; removes the key when empty/whitespace; otherwise stores trimmed.
    // Returns the trimmed value (mirrored in memory by currentName).
    function saveName(raw) {
        const trimmed = (raw == null ? "" : String(raw)).trim();
        try {
            if (trimmed === "") {
                localStorage.removeItem(NAME_KEY);
            } else {
                localStorage.setItem(NAME_KEY, trimmed);
            }
        } catch (e) {
            /* storage unavailable: fail silent, in-memory name still drives UI */
        }
        return trimmed;
    }

    // Expose the pure logic + persistence for independent (property-based) testing.
    window.DashboardGreeting = {
        isNameAbsent: isNameAbsent,
        timeOfDay: timeOfDay,
        buildGreeting: buildGreeting,
        NAME_KEY: NAME_KEY,
        loadName: loadName,
        saveName: saveName
    };

    let currentName = loadName(); // in-memory mirror of the stored name

    // Renders greeting/time/date each tick. (Requirement 1.6)
    // Uses buildGreeting(h, currentName) so a stored name personalizes the greeting
    // and an absent name falls back to the generic "<Time-of-Day>!" form.
    function updateGreeting() {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();

        greetingEl.textContent = buildGreeting(h, currentName);
        timeEl.textContent = pad(h) + ":" + pad(m);
        dateEl.textContent = DAYS[now.getDay()] + ", " + MONTHS[now.getMonth()] + " " + now.getDate() + ", " + now.getFullYear();
    }

    // Name control handler (Requirement 1.1): persist the entered name, keep the
    // in-memory mirror in sync, reflect the trimmed/cleared value back into the
    // input, and re-render the greeting immediately. (Requirements 1.2, 1.5)
    function commitName() {
        currentName = saveName(nameInputEl.value); // persist + update mirror
        nameInputEl.value = currentName;           // reflect trimmed/cleared value
        updateGreeting();                           // re-render immediately
    }

    // Bind Save click, Enter key, and blur to commitName().
    nameSaveBtn.addEventListener("click", commitName);
    nameInputEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); commitName(); }
    });
    nameInputEl.addEventListener("blur", commitName);

    /* =====================================================
       2. Focus Timer — 25-minute countdown
       ===================================================== */
    const FOCUS_MINUTES = 25;
    const TOTAL_SECONDS = FOCUS_MINUTES * 60;

    const timerDisplay = document.getElementById("timer-display");
    const startBtn = document.getElementById("timer-start");
    const stopBtn = document.getElementById("timer-stop");
    const resetBtn = document.getElementById("timer-reset");

    let remaining = TOTAL_SECONDS;
    let intervalId = null;

    function formatTime(secs) {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return pad(m) + ":" + pad(s);
    }

    function renderTimer() {
        timerDisplay.textContent = formatTime(remaining);
    }

    function setRunning(isRunning) {
        timerDisplay.classList.toggle("running", isRunning);
        startBtn.disabled = isRunning;
        stopBtn.disabled = !isRunning;
    }

    function tick() {
        remaining--;
        renderTimer();
        if (remaining <= 0) {
            clearInterval(intervalId);
            intervalId = null;
            remaining = TOTAL_SECONDS;
            renderTimer();
            setRunning(false);
            showToast("Time's up! Great focus session. 🎉"); // Requirement 2.1 (replaces alert)
        }
    }

    startBtn.addEventListener("click", function () {
        if (intervalId) return;
        intervalId = setInterval(tick, 1000);
        setRunning(true);
    });

    stopBtn.addEventListener("click", function () {
        if (!intervalId) return;
        clearInterval(intervalId);
        intervalId = null;
        setRunning(false);
    });

    resetBtn.addEventListener("click", function () {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        remaining = TOTAL_SECONDS;
        renderTimer();
        setRunning(false);
    });

    /* =====================================================
       3. To-Do List — add / edit / toggle / delete + storage
       ===================================================== */
    const todoForm = document.getElementById("todo-form");
    const todoInput = document.getElementById("todo-input");
    const todoList = document.getElementById("todo-list");
    const todoEmpty = document.getElementById("todo-empty");

    const TODO_KEY = "dashboard_todos";

    function loadTodos() {
        try {
            const raw = localStorage.getItem(TODO_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveTodos(todos) {
        localStorage.setItem(TODO_KEY, JSON.stringify(todos));
    }

    let todos = loadTodos();

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function toggleEmpty() {
        todoEmpty.style.display = todos.length === 0 ? "block" : "none";
    }

    function renderTodos() {
        todoList.innerHTML = "";
        todos.forEach(function (todo, index) {
            const li = document.createElement("li");
            li.className = "todo-item" + (todo.done ? " done" : "");

            // Checkbox
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "todo-checkbox";
            checkbox.checked = todo.done;
            checkbox.addEventListener("change", function () {
                todos[index].done = checkbox.checked;
                saveTodos(todos);
                li.classList.toggle("done", checkbox.checked);
            });

            // Editable text
            const text = document.createElement("input");
            text.type = "text";
            text.className = "todo-text";
            text.value = todo.text;
            text.readOnly = true;
            text.addEventListener("dblclick", function () {
                editTodo(index, text, editBtn);
            });

            // Edit button
            const editBtn = document.createElement("button");
            editBtn.className = "todo-btn edit-btn";
            editBtn.title = "Edit";
            editBtn.innerHTML = "&#9998;"; // pencil
            editBtn.addEventListener("click", function () {
                editTodo(index, text, editBtn);
            });

            // Delete button
            const delBtn = document.createElement("button");
            delBtn.className = "todo-btn delete-btn";
            delBtn.title = "Delete";
            delBtn.textContent = "\u00D7";
            delBtn.addEventListener("click", function () {
                todos.splice(index, 1);
                saveTodos(todos);
                renderTodos();
            });

            li.appendChild(checkbox);
            li.appendChild(text);
            li.appendChild(editBtn);
            li.appendChild(delBtn);
            todoList.appendChild(li);
        });
        toggleEmpty();
    }

    function editTodo(index, textEl, editBtn) {
        textEl.readOnly = false;
        textEl.focus();
        textEl.select();
        editBtn.innerHTML = "&#10003;"; // checkmark

        function finishEdit() {
            const val = textEl.value.trim();
            if (val) {
                todos[index].text = val;
                saveTodos(todos);
            } else {
                textEl.value = todos[index].text;
            }
            textEl.readOnly = true;
            editBtn.innerHTML = "&#9998;";
            textEl.removeEventListener("blur", finishEdit);
            textEl.removeEventListener("keydown", onKey);
        }

        function onKey(e) {
            if (e.key === "Enter") {
                e.preventDefault();
                textEl.blur();
            } else if (e.key === "Escape") {
                textEl.value = todos[index].text;
                textEl.readOnly = true;
                editBtn.innerHTML = "&#9998;";
                textEl.removeEventListener("blur", finishEdit);
                textEl.removeEventListener("keydown", onKey);
            }
        }

        textEl.addEventListener("blur", finishEdit);
        textEl.addEventListener("keydown", onKey);
    }

    todoForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const val = todoInput.value.trim();
        if (!val) return;
        todos.push({ text: val, done: false });
        saveTodos(todos);
        todoInput.value = "";
        renderTodos();
    });

    /* =====================================================
       4. Quick Links — add / open / delete + storage
       ===================================================== */
    const linkForm = document.getElementById("link-form");
    const linkName = document.getElementById("link-name");
    const linkUrl = document.getElementById("link-url");
    const linksList = document.getElementById("links-list");
    const linksEmpty = document.getElementById("links-empty");

    const LINKS_KEY = "dashboard_links";

    function loadLinks() {
        try {
            const raw = localStorage.getItem(LINKS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveLinks(links) {
        localStorage.setItem(LINKS_KEY, JSON.stringify(links));
    }

    let links = loadLinks();

    function normalizeUrl(url) {
        if (!/^https?:\/\//i.test(url)) {
            return "https://" + url;
        }
        return url;
    }

    function toggleLinksEmpty() {
        linksEmpty.style.display = links.length === 0 ? "block" : "none";
    }

    function renderLinks() {
        linksList.innerHTML = "";
        links.forEach(function (link, index) {
            const wrapper = document.createElement("div");
            wrapper.className = "link-item";

            const a = document.createElement("a");
            a.href = link.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = link.name;

            const delBtn = document.createElement("button");
            delBtn.className = "link-delete";
            delBtn.title = "Remove";
            delBtn.textContent = "\u00D7";
            delBtn.addEventListener("click", function () {
                links.splice(index, 1);
                saveLinks(links);
                renderLinks();
            });

            wrapper.appendChild(a);
            wrapper.appendChild(delBtn);
            linksList.appendChild(wrapper);
        });
        toggleLinksEmpty();
    }

    linkForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const name = linkName.value.trim();
        let url = linkUrl.value.trim();
        if (!name || !url) return;
        url = normalizeUrl(url);
        links.push({ name: name, url: url });
        saveLinks(links);
        linkName.value = "";
        linkUrl.value = "";
        renderLinks();
    });

    /* =====================================================
       5. Toast — non-blocking inline notification (auto-dismiss)
       Renders exactly one inline toast in the page DOM and removes it
       after the auto-dismiss duration. Replaces the former blocking
       alert() in the Focus Timer completion path. (Requirement 2.x)
       ===================================================== */
    const TOAST_AUTO_DISMISS_MS = 5000; // Requirement 2.4

    const toastContainer = document.getElementById("toast-container"); // from index.html (task 1.1)
    let toastEl = null;            // the currently displayed toast element, or null
    let toastDismissTimer = null;  // setTimeout handle for the pending auto-dismiss

    // Renders (or replaces) a single inline toast containing `message`.
    // Non-blocking: never calls alert/confirm/prompt, adds no modal overlay,
    // and never disables any control. (Requirements 2.1, 2.2, 2.3, 2.5)
    function showToast(message) {
        // Requirement 2.5: replace any existing toast before scheduling a new one
        clearToast();

        const el = document.createElement("div");
        el.className = "toast";                 // styled via existing tokens (task 1.2)
        el.setAttribute("role", "status");
        el.textContent = message;               // textContent => no HTML injection, message verbatim

        toastContainer.appendChild(el);          // inline element within the page DOM
        toastEl = el;

        // Requirement 2.4: auto-dismiss after the fixed duration
        toastDismissTimer = setTimeout(clearToast, TOAST_AUTO_DISMISS_MS);
    }

    // Removes the current toast and cancels any pending dismiss timer.
    // Safe to call when nothing is displayed (no-throw). (Requirement 2.5)
    function clearToast() {
        if (toastDismissTimer !== null) {
            clearTimeout(toastDismissTimer);
            toastDismissTimer = null;
        }
        if (toastEl && toastEl.parentNode) {
            toastEl.parentNode.removeChild(toastEl);
        }
        toastEl = null;
    }

    /* =====================================================
       Initialize
       ===================================================== */
    updateGreeting();
    setInterval(updateGreeting, 1000); // keep clock fresh every second
    renderTimer();
    setRunning(false);
    renderTodos();
    renderLinks();
    nameInputEl.value = currentName; // pre-fill name input from storage on load
})();
