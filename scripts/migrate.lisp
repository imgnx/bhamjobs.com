#!/usr/bin/env sbcl --script

;; Simple PostgreSQL migration runner in Common Lisp.
;; Usage: sbcl --script scripts/migrate.lisp [path]
;; Reads env vars: DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT

(defun getenv (name)
  (sb-ext:posix-getenv name))

(defun or-empty (x)
  (if x x ""))

(defun shell (cmd)
  (let* ((proc (sb-ext:run-program "/bin/sh" (list "-c" cmd)
                                   :input nil :output t :error t :wait t))
         (code (sb-ext:process-exit-code proc)))
    code))

(defun build-psql-cmd (file)
  (let* ((database-url (getenv "DATABASE_URL"))
         (host (or (getenv "PGHOST") "127.0.0.1"))
         (user (or (getenv "PGUSER") "postgres"))
         (pass (or-empty (getenv "PGPASSWORD")))
         (db   (or (getenv "PGDATABASE") "bhamjobs"))
         (port (or (getenv "PGPORT") "5432")))
    (if database-url
        (format nil "psql \"~A\" -v ON_ERROR_STOP=1 -f ~A" database-url file)
        (format nil "PGPASSWORD='~A' psql -h ~A -U ~A -d ~A -p ~A -v ON_ERROR_STOP=1 -f ~A"
                pass host user db port file))))

(defun main ()
  (let* ((args sb-ext:*posix-argv*)
         (file (or (and (> (length args) 1) (elt args 1)) "sql/init.sql"))
         (cmd (build-psql-cmd file)))
    (format t "Running: ~A~%" cmd)
    (let ((code (shell cmd)))
      (unless (= 0 code)
        (format *error-output* "Migration failed with exit code ~A~%" code)
        (sb-ext:exit :code code)))))

(main)

