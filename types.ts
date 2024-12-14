import { ObjectId, OptionalId } from "mongodb";

export type studentModel = OptionalId<{
    name: string;
    email: string;
    enrolledCourses: ObjectId[];
}>;

export type teacherModel = OptionalId<{
    name: string;
    email: string;
    coursesTaught: ObjectId[];
}>;

export type courseModel = OptionalId<{
    title: string;
    description: string;
    teacherId: ObjectId | null;
    studentIds: ObjectId[];
}>;
