// Create needed constants from elements
const nameInput = document.getElementById('inputTaskName')
const descriptionInput = document.getElementById('inputTaskDescription')
const form = document.querySelector('form')

// Button Constructor
function LabelledButton (label, onclickFunc, cls) {
    this.btn = document.createElement('button')
    this.btn.appendChild(document.createTextNode(label))
    this.btn.onclick = onclickFunc
    this.btn.className = cls
}

let db

window.onload = function () {
    let request = window.indexedDB.open('tasks', 1)
    request.onerror = function () {
        console.log('Database failed to load')
    }
    request.onsuccess = function () {
        console.log('Database successfully loaded')
        db = request.result
        displayAllTasks()
    }

    request.onupgradeneeded = function(eve) {
        let db = eve.target.result
        let objectStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement:true })
        objectStore.createIndex('name', 'name', { unique: false })
        objectStore.createIndex('description', 'description', { unique: false })
        objectStore.createIndex('completed', 'completed', { unique: false })
  
        console.log('Database setup complete') 
    }

    form.onsubmit = addTask

    function addTask (eve) {
        eve.preventDefault()
        let newTask = { name: nameInput.value, description: descriptionInput.value, completed: false }
        let transaction = db.transaction(['tasks'], 'readwrite')
        let objectStore = transaction.objectStore('tasks')
        var request = objectStore.add(newTask)
        request.onsuccess = function () { // onsuccess fires when request is queued, could consider moving this to inside oncomplete
            nameInput.value = ''
            descriptionInput.value = ''
        }
    
        transaction.oncomplete = function() { // oncomplete fires when transaction is successful
            console.log('Database successfully modified.')
            // if no tasks displayed, get rid of text node
            displayTask(newTask.name, newTask.description, false, request.result) // result contains new task id value
        }
        
        transaction.onerror = function() {
            console.log('Database modification failed.')
        }
    }

    function deleteTask (eve) {
        let main = document.querySelector('main')
        let taskId = Number(eve.target.parentNode.getAttribute('task-id'))
        let transaction = db.transaction(['tasks'], 'readwrite')
        let objectStore = transaction.objectStore('tasks')
        let request = objectStore.delete(taskId)
    
        transaction.oncomplete = function() {
            main.removeChild(eve.target.parentNode)
            console.log('Task ' + taskId + ' deleted')
      
            if(document.querySelectorAll('div.task').length === 0) {
                main.insertBefore(document.createTextNode('No tasks stored.'), document.getElementById('inputDivider'))
            }
        }
    }
    
    function editTask () {}
    function describeTask () {}
    function completeTask () {}    

    function clearTask (task, index, nodelist) { // remove a task from display
        let main = document.querySelector('main')
        main.removeChild(task)
    }

    // Adds a task to the display given its parameters
    function displayTask (name, description, completed, id) {
        let task = document.createElement("div")
        task.className = "task"
        task.setAttribute('task-id', id)

        task.appendChild(document.createTextNode(name))
        task.appendChild(new LabelledButton('delete', deleteTask, 'deleteBtn').btn)
        task.appendChild(new LabelledButton('edit', editTask, 'editBtn').btn)
        task.appendChild(new LabelledButton('describe', describeTask, 'describeBtn').btn)
        task.appendChild(new LabelledButton('completed', completeTask, 'completeBtn').btn)
        task.appendChild(document.createTextNode(description))
        let main = document.querySelector('main')
        main.insertBefore(task, document.getElementById('inputDivider'))
    }    

    function displayAllTasks () {

        // first clear away currently displayed tasks
        let tasks = document.querySelectorAll('div.task')
        tasks.forEach(clearTask)


        let objectStore = db.transaction('tasks').objectStore('tasks')
        objectStore.openCursor().onsuccess = function(e) {
            let cursor = e.target.result
      
            if(cursor) {
                displayTask(cursor.value.name, cursor.value.description, cursor.value.completed, cursor.value.id)
                cursor.continue()
            } else {
              if(document.querySelectorAll('div.task').length === 0) { // needs testing
                let main = document.querySelector('main') 
                main.insertBefore(document.createTextNode('No tasks stored.'), document.getElementById('inputDivider'))
              }
              console.log('Tasks all displayed')
            }
        }
    }
}
