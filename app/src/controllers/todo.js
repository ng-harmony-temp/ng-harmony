import { EventedController as Ctrl } from "ng-harmony/ng-harmony-evented";
import { Controller } from "ng-harmony/ng-harmony-annotate";

@Controller({
	module: "todomvc",
	name: "Todo",
	deps: ["$filter", "$http", "TodoStorage"]
})
export default class TodoController extends Ctrl {
    constructor (...args) {
        super(...args);

        this.$scope.todos = this.TodoStorage.todos;
        this.todos = this.TodoStorage.todos;
        this.$scope.newTodo = "";
        this.$scope.editedTodo = null;

        this.$scope.$watch("todos", () => {
            this.$scope.remainingCount = this.$filter("filter")(this.todos, { completed: false }).length;
            this.$scope.completedCount = this.todos.length - this.$scope.remainingCount;
            this.$scope.allChecked = !this.$scope.remainingCount;
        }, true);

        // Monitor the current route for changes and adjust the filter accordingly.
        this.$scope.$on("$stateChangeSuccess", (ev, to, tParams, from, fParams) => {
            
            let status =  to.url;
            this.$scope.statusFilter = (status === "active") ?
            { completed: false } : (status === "completed") ?
            { completed: true } : {};
        });
    }

	"form#todo-form::submit" () {
		let newTodo = {
			title: this.$scope.newTodo.trim(),
			completed: false
		};
		if (!newTodo.title) {
			return;
		}

		this.$scope.saving = true;
		this.TodoStorage.insert(newTodo)
			.then(() => {
				this.$scope.newTodo = "";
			})
			.finally(() => {
				this.$scope.saving = false;
			});
	}

	"#todo-list::dblclick::label<li" () {
		this.$scope.editedTodo = this.todos[this.$scope.i];

		// Clone the original todo to restore it on demand.
		this.$scope.originalTodo = angular.extend({}, this.todos[this.$scope.i]);
	}

	"#todo-list::click::button<li" () {
		this.TodoStorage.delete(this.$scope.todos[this.$scope.i]);
	}

	"#todo-list::change::.toggle<li" (ev) {
		this.TodoStorage
            .put(this.$scope.todos[this.$scope.i], this.$scope.i)
			.then(() => {}, () => {
				this.$scope.todos[this.$scope.i].completed = !this.$scope.todos[this.$scope.i].completed;
				this.digest();
			});
	}

	"footer>button::click" () {
		this.TodoStorage.clearCompleted();
	}

	"#toggle-all::click" () {
		for (let [i, val] of this.$scope.todos.entries()) {
			val.completed = !this.$scope.allChecked;
		}
	}

	"#todo-list::blur::form input>li" () {
		this.$saveEdits(this.$scope.todos[this.$scope.i], "blur");
	}
	"#todo-list::submit::form>li" () {
		this.$saveEdits(this.$scope.todos[this.$scope.i], "submit");
	}

    $saveEdits (todo, event) {
		// Blur events are automatically triggered after the form submit event.
		// This does some unfortunate logic handling to prevent saving twice.
		if (event === "blur" && this.$scope.saveEvent === "submit") {
			this.$scope.saveEvent = null;
			return;
		}

		this.$scope.saveEvent = event;

		if (this.$scope.reverted) {
			// Todo edits were reverted-- don't save.
			this.$scope.reverted = null;
			return;
		}

		todo.title = todo.title.trim();

		if (todo.title === this.$scope.originalTodo.title) {
			this.$scope.editedTodo = null;
			return;
		}

		this.TodoStorage[todo.title ? "put" : "delete"](todo)
			.then(() => {}, () => {
				todo.title = this.$scope.originalTodo.title;
			})
			.finally(() => {
				this.$scope.editedTodo = null;
			});
	}

	$revertEdits (todo) {
		this.todos[this.todos.indexOf(todo)] = this.$scope.originalTodo;
		this.$scope.editedTodo = null;
		this.$scope.originalTodo = null;
		this.$scope.reverted = true;
	}

	$saveTodo (todo) {
		this.TodoStorage.put(todo);
	}
}