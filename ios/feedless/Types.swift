//
//  Types.swift
//  feedless
//
//  Created by Rogerio Chaves on 04/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

typealias Posts = [PostEntry]

struct Post: Codable {
    public var text: String
}

typealias PostEntry = Entry<AuthorProfileContent<Post>>

struct AuthorContent<T: Codable>: Codable {
    public var author: String
    public var content: T
}

struct AuthorProfileContent<T: Codable>: Codable {
    public var author: String
    public var authorProfile: Profile
    public var content: T
}

struct Entry<T: Codable>: Codable {
    public var key: String
    public var value: T
}

struct Profile: Codable {
    public var id: String
    public var name: String?
    public var image: String?
    public var description: String?
}

struct SSBKey : Decodable {
    enum CodingKeys: String, CodingKey {
        case curve
        case publicKey = "public"
        case privateKey = "private"
        case id
    }

    var curve : String
    var publicKey : String
    var privateKey : String
    var id : String
}

enum ServerData<T> {
    case loading
    case success(T)
    case error(String)
}

struct PostResult : Codable {
    public var result : String
}
