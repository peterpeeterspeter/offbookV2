import { Request, Response } from 'express';
export declare function createRoom(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteRoom(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
