//
//  Types.swift
//  feedless
//
//  Created by Rogerio Chaves on 04/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

struct Post: Codable {
    public var text: String
}

struct AuthorContent<T: Codable>: Codable {
    public var author: String
    public var content: T
}

struct Entry<T: Codable>: Codable {
    public var key: String
    public var value: T
}

struct Profile: Codable {
    public var id: String
    public var name: String
    public var image: String
}

struct User : Codable {
    public var profile: Profile?
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
